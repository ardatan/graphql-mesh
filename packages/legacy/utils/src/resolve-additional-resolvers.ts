import { dset } from 'dset';
import type {
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLSchema,
  GraphQLType,
  SelectionSetNode,
} from 'graphql';
import {
  getNamedType,
  getNullableType,
  isAbstractType,
  isInterfaceType,
  isListType,
  isObjectType,
  Kind,
} from 'graphql';
import lodashGet from 'lodash.get';
import toPath from 'lodash.topath';
import { process } from '@graphql-mesh/cross-helpers';
import type { MeshContext } from '@graphql-mesh/runtime';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import {
  isHivePubSub,
  type HivePubSub,
  type ImportFn,
  type MeshPubSub,
  type YamlConfig,
} from '@graphql-mesh/types';
import type { IResolvers, MaybePromise } from '@graphql-tools/utils';
import { parseSelectionSet } from '@graphql-tools/utils';
import { handleMaybePromise, mapAsyncIterator } from '@whatwg-node/promise-helpers';
import { loadFromModuleExportExpression } from './load-from-module-export-expression.js';
import { withFilter } from './with-filter.js';

function getTypeByPath(type: GraphQLType, path: string[]): GraphQLNamedType {
  if ('ofType' in type) {
    return getTypeByPath(getNamedType(type), path);
  }
  if (path.length === 0) {
    return getNamedType(type);
  }
  if (!('getFields' in type)) {
    throw new Error(`${type} cannot have a path ${path.join('.')}`);
  }
  const fieldMap = type.getFields();
  const currentFieldName = path[0];
  // Might be an index of an array
  if (!Number.isNaN(parseInt(currentFieldName))) {
    return getTypeByPath(type, path.slice(1));
  }
  const field = fieldMap[currentFieldName];
  if (!field?.type) {
    throw new Error(`${type}.${currentFieldName} is not a valid field.`);
  }
  return getTypeByPath(field.type, path.slice(1));
}

function ensurePathInSelectionSet(
  selectionSet: SelectionSetNode | undefined,
  path: string[],
): SelectionSetNode {
  if (path.length === 0) {
    return (
      selectionSet ?? {
        kind: Kind.SELECTION_SET,
        selections: [],
      }
    );
  }

  const [head, ...rest] = path;
  const selections = selectionSet?.selections ? [...selectionSet.selections] : [];
  // Reuse an existing field even if it has @skip/@include (or other directives).
  // Appending a second bare field with the same name would violate GraphQL field merging.
  const existingField = selections.find(
    selection => selection.kind === Kind.FIELD && !selection.alias && selection.name.value === head,
  );

  if (existingField && existingField.kind === Kind.FIELD) {
    if (rest.length === 0) {
      return {
        kind: Kind.SELECTION_SET,
        selections,
      };
    }
    const nestedSelectionSet = ensurePathInSelectionSet(existingField.selectionSet, rest);
    return {
      kind: Kind.SELECTION_SET,
      selections: selections.map(selection =>
        selection === existingField
          ? {
              ...existingField,
              selectionSet: nestedSelectionSet,
            }
          : selection,
      ),
    };
  }

  const newField =
    rest.length === 0
      ? {
          kind: Kind.FIELD as const,
          name: {
            kind: Kind.NAME as const,
            value: head,
          },
        }
      : {
          kind: Kind.FIELD as const,
          name: {
            kind: Kind.NAME as const,
            value: head,
          },
          selectionSet: ensurePathInSelectionSet(undefined, rest),
        };

  return {
    kind: Kind.SELECTION_SET,
    selections: [...selections, newField],
  };
}

function generateSelectionSetFactory(
  schema: GraphQLSchema,
  additionalResolver:
    | YamlConfig.AdditionalStitchingBatchResolverObject
    | YamlConfig.AdditionalStitchingResolverObject,
) {
  const valueKeyField =
    'valueKeyField' in additionalResolver ? additionalResolver.valueKeyField : undefined;
  const valueKeyPath = valueKeyField ? toPath(valueKeyField) : undefined;

  const ensureValueKeyField = (subtree: SelectionSetNode | undefined): SelectionSetNode => {
    if (!valueKeyPath?.length) {
      return (
        subtree ?? {
          kind: Kind.SELECTION_SET,
          selections: [],
        }
      );
    }
    return ensurePathInSelectionSet(subtree, valueKeyPath);
  };

  if (additionalResolver.sourceSelectionSet) {
    return () => ensureValueKeyField(parseSelectionSet(additionalResolver.sourceSelectionSet));
    // If result path provided without a selectionSet
  } else if (additionalResolver.result) {
    const resultPath = toPath(additionalResolver.result);
    let abstractResultTypeName: string | undefined;

    // `info.schema` is the gateway/supergraph schema. Encapsulate (and similar
    // transforms) keep the real source field as an @inaccessible copy such as
    // `_encapsulated_<name>_<field>`, which federation then strips from the
    // supergraph. Selection-set wrapping from `result` still works without that
    // field; we only need its type when the projected path is abstract.
    const sourceType = schema.getType(additionalResolver.sourceTypeName);
    const sourceField =
      sourceType && 'getFields' in sourceType
        ? (sourceType as GraphQLObjectType).getFields()[additionalResolver.sourceFieldName]
        : undefined;
    const resultFieldType = sourceField?.type
      ? getTypeByPath(sourceField.type, resultPath)
      : undefined;

    if (resultFieldType && isAbstractType(resultFieldType)) {
      if (additionalResolver.resultType) {
        abstractResultTypeName = additionalResolver.resultType;
      } else {
        const targetType = schema.getType(additionalResolver.targetTypeName) as GraphQLObjectType;
        const targetTypeFields = targetType.getFields();
        const targetField = targetTypeFields[additionalResolver.targetFieldName];
        const targetFieldType = getNamedType(targetField.type);
        abstractResultTypeName = targetFieldType?.name;
      }
      if (abstractResultTypeName !== resultFieldType.name) {
        const abstractResultType = schema.getType(abstractResultTypeName);
        if (
          (isInterfaceType(abstractResultType) || isObjectType(abstractResultType)) &&
          !schema.isSubType(resultFieldType, abstractResultType)
        ) {
          throw new Error(
            `${additionalResolver.sourceTypeName}.${
              additionalResolver.sourceFieldName
            }.${resultPath.join('.')} doesn't implement ${abstractResultTypeName}.}`,
          );
        }
      }
    }

    return (subtree: SelectionSetNode) => {
      let finalSelectionSet = ensureValueKeyField(subtree);
      let isLastResult = true;
      const resultPathReversed = [...resultPath].reverse();
      for (const pathElem of resultPathReversed) {
        // Ensure the path elem is not array index
        if (Number.isNaN(parseInt(pathElem))) {
          if (
            isLastResult &&
            abstractResultTypeName &&
            resultFieldType &&
            abstractResultTypeName !== resultFieldType.name
          ) {
            finalSelectionSet = {
              kind: Kind.SELECTION_SET,
              selections: [
                {
                  kind: Kind.INLINE_FRAGMENT,
                  typeCondition: {
                    kind: Kind.NAMED_TYPE,
                    name: {
                      kind: Kind.NAME,
                      value: abstractResultTypeName,
                    },
                  },
                  selectionSet: finalSelectionSet,
                },
              ],
            };
          }
          finalSelectionSet = {
            kind: Kind.SELECTION_SET,
            selections: [
              {
                // we create a wrapping AST Field
                kind: Kind.FIELD,
                name: {
                  kind: Kind.NAME,
                  value: pathElem,
                },
                // Inside the field selection
                selectionSet: finalSelectionSet,
              },
            ],
          };
          isLastResult = false;
        }
      }
      return finalSelectionSet;
    };
  } else if (valueKeyPath?.length) {
    return (subtree: SelectionSetNode) => ensureValueKeyField(subtree);
  }
  return undefined;
}

function generateValuesFromResults(resultExpression: string): (result: any) => any {
  return function valuesFromResults(result: any): any {
    if (Array.isArray(result)) {
      return result.map(valuesFromResults);
    }
    return lodashGet(result, resultExpression);
  };
}

function generateValuesFromResultsByKey(
  valueKeyField: string,
  resultExpression: string | undefined,
  isListReturnType: boolean,
): (results: any, keys?: readonly any[]) => any {
  const extractResult = resultExpression ? generateValuesFromResults(resultExpression) : undefined;

  return function valuesFromResults(results: any, keys: readonly any[] = []): any[] {
    const extracted = extractResult ? extractResult(results) : results;
    const items = Array.isArray(extracted) ? extracted : extracted == null ? [] : [extracted];

    const matchesByKey = new Map<any, any[]>();
    for (const item of items) {
      if (item == null) {
        continue;
      }
      const resultKey = lodashGet(item, valueKeyField);
      if (resultKey == null) {
        continue;
      }
      const bucket = matchesByKey.get(resultKey);
      if (bucket) {
        bucket.push(item);
      } else {
        matchesByKey.set(resultKey, [item]);
      }
    }

    return keys.map(key => {
      const matches = matchesByKey.get(key);
      if (isListReturnType) {
        return matches ?? [];
      }
      return matches?.[0] ?? null;
    });
  };
}

export interface PubSubOperationOptions {
  pubsubTopic: string;
  pubsub?: MeshPubSub | HivePubSub;
  filterBy?: string;
  result?: string;
}

export function getResolverForPubSubOperation(
  opts: PubSubOperationOptions,
  valuesFromResults?: (result: any) => any,
) {
  const pubsubTopic = opts.pubsubTopic;
  let subscribeFn = function subscriber(
    root: any,
    args: Record<string, any>,
    context: MeshContext,
    info: GraphQLResolveInfo,
  ): MaybePromise<AsyncIterator<any>> {
    const resolverData = { root, args, context, info, env: process.env };
    const topic = stringInterpolator.parse(pubsubTopic, resolverData);
    const ps = context?.pubsub || opts?.pubsub;
    if (isHivePubSub(ps)) {
      return ps.subscribe(topic)[Symbol.asyncIterator]();
    }
    return ps.asyncIterator(topic)[Symbol.asyncIterator]();
  };
  if (opts.filterBy) {
    let filterFunction: any;
    try {
      // eslint-disable-next-line no-new-func
      filterFunction = new Function('root', 'args', 'context', 'info', `return ${opts.filterBy};`);
    } catch (e) {
      throw new Error(
        `Error while parsing filterBy expression "${opts.filterBy}" in additional subscription resolver: ${e.message}`,
      );
    }
    subscribeFn = withFilter(subscribeFn as any, filterFunction);
  }

  return {
    subscribe: subscribeFn,
    resolve: (payload: any) => (valuesFromResults ? valuesFromResults(payload) : payload),
  };
}

export function resolveAdditionalResolversWithoutImport(
  additionalResolver:
    | YamlConfig.AdditionalStitchingResolverObject
    | YamlConfig.AdditionalSubscriptionObject
    | YamlConfig.AdditionalStitchingBatchResolverObject,
  pubsub?: MeshPubSub | HivePubSub,
): IResolvers {
  const baseOptions: any = {
    valuesFromResults: additionalResolver.result
      ? generateValuesFromResults(additionalResolver.result)
      : undefined,
  };
  if ('pubsubTopic' in additionalResolver) {
    const { subscribe, resolve } = getResolverForPubSubOperation(
      {
        pubsubTopic: additionalResolver.pubsubTopic,
        pubsub,
        filterBy: additionalResolver.filterBy,
        result: additionalResolver.result,
      },
      baseOptions.valuesFromResults,
    );
    return {
      [additionalResolver.targetTypeName]: {
        [additionalResolver.targetFieldName]: {
          subscribe: (...args: Parameters<typeof subscribe>) => {
            // pubsub emits the raw value, but graphql-js passes each subscription event through the root
            // field resolver and expects the event to be shaped like { [fieldName]: value }
            return handleMaybePromise(
              () => subscribe(...args),
              iterator =>
                mapAsyncIterator(iterator, payload => ({
                  [additionalResolver.targetFieldName]: payload,
                })),
            );
          },
          resolve: (payload, ...args) =>
            resolve(
              payload[additionalResolver.targetFieldName],
              // @ts-expect-error in case the resolver args expand, we're ready to pass
              ...args,
            ),
        },
      },
    };
  } else if ('keysArg' in additionalResolver) {
    return {
      [additionalResolver.targetTypeName]: {
        [additionalResolver.targetFieldName]: {
          selectionSet:
            additionalResolver.requiredSelectionSet || `{ ${additionalResolver.keyField} }`,
          resolve: async (root: any, args: any, context: any, info: any) => {
            if (!baseOptions.selectionSet) {
              baseOptions.selectionSet = generateSelectionSetFactory(
                info.schema,
                additionalResolver,
              );
            }
            if (
              additionalResolver.valueKeyField &&
              baseOptions.valuesFromResultsByKeyReturnType !== info.returnType
            ) {
              baseOptions.valuesFromResults = generateValuesFromResultsByKey(
                additionalResolver.valueKeyField,
                additionalResolver.result,
                isListType(getNullableType(info.returnType)),
              );
              baseOptions.valuesFromResultsByKeyReturnType = info.returnType;
            }
            const resolverData = { root, args, context, info, env: process.env };
            const targetArgs: any = {};
            for (const argPath in additionalResolver.additionalArgs || {}) {
              const value = additionalResolver.additionalArgs[argPath];
              dset(
                targetArgs,
                argPath,
                typeof value === 'string' ? stringInterpolator.parse(value, resolverData) : value,
              );
            }
            const options: any = {
              selectionSet: baseOptions.selectionSet,
              valuesFromResults: baseOptions.valuesFromResults,
              root,
              context,
              info,
              argsFromKeys: (keys: string[]) => {
                const args: any = {};
                dset(args, additionalResolver.keysArg, keys);
                Object.assign(args, targetArgs);
                return args;
              },
              key: lodashGet(root, additionalResolver.keyField),
            };
            return context[additionalResolver.sourceName][additionalResolver.sourceTypeName][
              additionalResolver.sourceFieldName
            ](options);
          },
        },
      },
    };
  } else if ('targetTypeName' in additionalResolver) {
    return {
      [additionalResolver.targetTypeName]: {
        [additionalResolver.targetFieldName]: {
          selectionSet: additionalResolver.requiredSelectionSet,
          resolve: (root: any, args: any, context: any, info: GraphQLResolveInfo) => {
            // Assert source exists
            if (!context[additionalResolver.sourceName]) {
              throw new Error(`No source found named "${additionalResolver.sourceName}"`);
            }
            if (!context[additionalResolver.sourceName][additionalResolver.sourceTypeName]) {
              throw new Error(
                `No root type found named "${additionalResolver.sourceTypeName}" exists in the source ${additionalResolver.sourceName}\n` +
                  `It should be one of the following; ${Object.keys(
                    context[additionalResolver.sourceName],
                  ).join(',')})}}`,
              );
            }
            if (additionalResolver.sourceFieldName === '__typename') {
              return additionalResolver.sourceTypeName;
            }
            if (
              !context[additionalResolver.sourceName][additionalResolver.sourceTypeName][
                additionalResolver.sourceFieldName
              ]
            ) {
              throw new Error(
                `No field named "${additionalResolver.sourceFieldName}" exists in the type ${additionalResolver.sourceTypeName} from the source ${additionalResolver.sourceName}`,
              );
            }

            if (!baseOptions.selectionSet) {
              baseOptions.selectionSet = generateSelectionSetFactory(
                info.schema,
                additionalResolver,
              );
            }
            const resolverData = { root, args, context, info, env: process.env };
            const targetArgs: any = {};

            deeplySetArgs(
              resolverData,
              { targetArgs },
              'targetArgs',
              additionalResolver.sourceArgs,
            );

            const options: any = {
              ...baseOptions,
              root,
              args: targetArgs,
              context,
              info,
            };
            return context[additionalResolver.sourceName][additionalResolver.sourceTypeName][
              additionalResolver.sourceFieldName
            ](options);
          },
        },
      },
    };
  } else {
    return additionalResolver;
  }
}

export function resolveAdditionalResolvers(
  baseDir: string,
  additionalResolvers: (
    | string
    | YamlConfig.AdditionalStitchingResolverObject
    | YamlConfig.AdditionalSubscriptionObject
    | YamlConfig.AdditionalStitchingBatchResolverObject
  )[],
  importFn: ImportFn,
  pubsub: MeshPubSub | HivePubSub,
): Promise<IResolvers[]> {
  return Promise.all(
    (additionalResolvers || []).map(async additionalResolver => {
      if (typeof additionalResolver === 'string') {
        const resolvers = await loadFromModuleExportExpression<any>(additionalResolver, {
          cwd: baseDir,
          defaultExportName: 'resolvers',
          importFn,
        });

        if (!resolvers) {
          console.warn(`Unable to load resolvers from file: ${additionalResolver}`);

          return {};
        }

        return resolvers;
      } else {
        return resolveAdditionalResolversWithoutImport(additionalResolver, pubsub);
      }
    }),
  );
}

function deeplySetArgs(resolverData: any, args: object, path: string, value: any) {
  if (typeof value === 'string') {
    dset(args, path, stringInterpolator.parse(value.toString(), resolverData));
  } else {
    for (const key in value) {
      deeplySetArgs(resolverData, args, `${path}.${key}`, value[key]);
    }
  }
}
