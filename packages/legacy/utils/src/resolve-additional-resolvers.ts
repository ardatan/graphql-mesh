import { dset } from 'dset';
import type {
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLSchema,
  GraphQLType,
  SelectionSetNode,
} from 'graphql';
import { getNamedType, isAbstractType, isInterfaceType, isObjectType, Kind, print } from 'graphql';
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
import type { MergedTypeResolver, StitchingInfo, Subschema } from '@graphql-tools/delegate';
import type { IResolvers, Maybe, MaybePromise } from '@graphql-tools/utils';
import { parseSelectionSet } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { loadFromModuleExportExpression } from './load-from-module-export-expression.js';
import { containsSelectionSet, selectionSetOfData } from './selectionSet.js';
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

function generateSelectionSetFactory(
  schema: GraphQLSchema,
  additionalResolver:
    | YamlConfig.AdditionalStitchingBatchResolverObject
    | YamlConfig.AdditionalStitchingResolverObject,
) {
  if (additionalResolver.sourceSelectionSet) {
    return () => parseSelectionSet(additionalResolver.sourceSelectionSet);
    // If result path provided without a selectionSet
  } else if (additionalResolver.result) {
    const resultPath = toPath(additionalResolver.result);
    let abstractResultTypeName: string;

    const sourceType = schema.getType(additionalResolver.sourceTypeName) as GraphQLObjectType;
    const sourceTypeFields = sourceType.getFields();
    const sourceField = sourceTypeFields[additionalResolver.sourceFieldName];
    const resultFieldType = getTypeByPath(sourceField.type, resultPath);

    if (isAbstractType(resultFieldType)) {
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
      let finalSelectionSet = subtree;
      let isLastResult = true;
      const resultPathReversed = [...resultPath].reverse();
      for (const pathElem of resultPathReversed) {
        // Ensure the path elem is not array index
        if (Number.isNaN(parseInt(pathElem))) {
          if (
            isLastResult &&
            abstractResultTypeName &&
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

export function resolveAdditionalResolversWithoutImport(
  additionalResolver:
    | YamlConfig.AdditionalStitchingResolverObject
    | YamlConfig.AdditionalSubscriptionObject
    | YamlConfig.AdditionalStitchingBatchResolverObject,
  pubsub?: MeshPubSub | HivePubSub,
): IResolvers {
  const baseOptions: any = {};
  if (additionalResolver.result) {
    baseOptions.valuesFromResults = generateValuesFromResults(additionalResolver.result);
  }
  if ('pubsubTopic' in additionalResolver) {
    const pubsubTopic = additionalResolver.pubsubTopic;
    let subscribeFn = function subscriber(
      root: any,
      args: Record<string, any>,
      context: MeshContext,
      info: GraphQLResolveInfo,
    ): MaybePromise<AsyncIterator<any>> {
      const resolverData = { root, args, context, info, env: process.env };
      const topic = stringInterpolator.parse(pubsubTopic, resolverData);
      const ps = context?.pubsub || pubsub;
      if (isHivePubSub(ps)) {
        return ps.subscribe(topic)[Symbol.asyncIterator]();
      }
      return ps.asyncIterator(topic)[Symbol.asyncIterator]();
    };
    if (additionalResolver.filterBy) {
      let filterFunction: any;
      try {
        // eslint-disable-next-line no-new-func
        filterFunction = new Function(
          'root',
          'args',
          'context',
          'info',
          `return ${additionalResolver.filterBy};`,
        );
      } catch (e) {
        throw new Error(
          `Error while parsing filterBy expression "${additionalResolver.filterBy}" in additional subscription resolver: ${e.message}`,
        );
      }
      subscribeFn = withFilter(subscribeFn, filterFunction);
    }
    return {
      [additionalResolver.targetTypeName]: {
        [additionalResolver.targetFieldName]: {
          subscribe: subscribeFn,
          resolve: (payload: any, _, ctx, info) => {
            function resolvePayload(payload: any) {
              if (baseOptions.valuesFromResults) {
                return baseOptions.valuesFromResults(payload);
              }
              return payload;
            }
            const stitchingInfo = info?.schema.extensions?.stitchingInfo as Maybe<
              StitchingInfo<any>
            >;
            if (!stitchingInfo) {
              return resolvePayload(payload); // no stitching, cannot be resolved anywhere else
            }
            const returnTypeName = getNamedType(info.returnType).name;
            const mergedTypeInfo = stitchingInfo?.mergedTypes?.[returnTypeName];
            if (!mergedTypeInfo) {
              return resolvePayload(payload); // this type is not merged or resolvable
            }

            // find the best resolver by diffing the selection sets
            const availableSelSet = selectionSetOfData(payload);
            let resolver: MergedTypeResolver | null = null;
            let subschema: Subschema | null = null;
            for (const [requiredSubschema, requiredSelSet] of mergedTypeInfo.selectionSets) {
              const matchResolver = mergedTypeInfo?.resolvers.get(requiredSubschema);
              if (!matchResolver) {
                // the subschema has no resolvers, nothing to search for
                continue;
              }
              if (containsSelectionSet(requiredSelSet, availableSelSet)) {
                // all of the fields of the requesting selection set is exist in the required selection set
                resolver = matchResolver;
                subschema = requiredSubschema;
                break;
              }
            }
            if (!resolver || !subschema) {
              // the type cannot be resolved
              return resolvePayload(payload);
            }

            return handleMaybePromise(
              () =>
                resolver(
                  payload,
                  ctx,
                  info,
                  subschema,
                  info.fieldNodes[0].selectionSet,
                  undefined,
                  info.returnType,
                ),
              resolvePayload,
            );
          },
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
              ...baseOptions,
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
