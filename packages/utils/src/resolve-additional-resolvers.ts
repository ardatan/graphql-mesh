import { YamlConfig, MeshPubSub, SyncImportFn } from '@graphql-mesh/types';
import { IResolvers, parseSelectionSet } from '@graphql-tools/utils';
import {
  GraphQLResolveInfo,
  SelectionSetNode,
  Kind,
  GraphQLSchema,
  GraphQLObjectType,
  getNamedType,
  isAbstractType,
  GraphQLType,
} from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import _ from 'lodash';
import { stringInterpolator } from './string-interpolator';
import { loadFromModuleExportExpressionSync } from './load-from-module-export-expression';
import { env } from 'process';

function getTypeByPath(type: GraphQLType, path: string[]): GraphQLType {
  if ('ofType' in type) {
    return getTypeByPath(type.ofType, path);
  }
  if (path.length === 0) {
    return type;
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
  additionalResolver: YamlConfig.AdditionalStitchingBatchResolverObject | YamlConfig.AdditionalStitchingResolverObject
) {
  if (additionalResolver.sourceSelectionSet) {
    return () => parseSelectionSet(additionalResolver.sourceSelectionSet);
    // If result path provided without a selectionSet
  } else if (additionalResolver.result) {
    const resultPath = _.toPath(additionalResolver.result);
    let abstractResultType: string;

    const sourceType = schema.getType(additionalResolver.sourceTypeName) as GraphQLObjectType;
    const sourceTypeFields = sourceType.getFields();
    const sourceField = sourceTypeFields[additionalResolver.sourceFieldName];
    const resultFieldType = getTypeByPath(sourceField.type, resultPath);

    if (isAbstractType(resultFieldType)) {
      if (additionalResolver.resultType) {
        abstractResultType = additionalResolver.resultType;
      } else {
        const targetType = schema.getType(additionalResolver.targetTypeName) as GraphQLObjectType;
        const targetTypeFields = targetType.getFields();
        const targetField = targetTypeFields[additionalResolver.targetFieldName];
        const targetFieldType = getNamedType(targetField.type);
        abstractResultType = targetFieldType?.name;
      }
      const possibleTypes = schema.getPossibleTypes(resultFieldType);
      if (!possibleTypes.some(possibleType => possibleType.name === abstractResultType)) {
        throw new Error(
          `${additionalResolver.sourceTypeName}.${additionalResolver.sourceFieldName}.${resultPath.join(
            '.'
          )} doesn't implement ${abstractResultType}. Please specify one of the following types as "returnType"; ${possibleTypes.map(
            t => t.name
          )}`
        );
      }
    }

    return (subtree: SelectionSetNode) => {
      let finalSelectionSet = subtree;
      let isLastResult = true;
      for (const pathElem of resultPath) {
        // Ensure the path elem is not array index
        if (Number.isNaN(parseInt(pathElem))) {
          if (isLastResult && abstractResultType) {
            finalSelectionSet = {
              kind: Kind.SELECTION_SET,
              selections: [
                {
                  kind: Kind.INLINE_FRAGMENT,
                  typeCondition: {
                    kind: Kind.NAMED_TYPE,
                    name: {
                      kind: Kind.NAME,
                      value: abstractResultType,
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
    return _.get(result, resultExpression);
  };
}

export function resolveAdditionalResolvers(
  baseDir: string,
  additionalResolvers: (
    | string
    | YamlConfig.AdditionalStitchingResolverObject
    | YamlConfig.AdditionalSubscriptionObject
    | YamlConfig.AdditionalStitchingBatchResolverObject
  )[],
  syncImportFn: SyncImportFn,
  pubsub: MeshPubSub
): IResolvers[] {
  return (additionalResolvers || []).map(additionalResolver => {
    if (typeof additionalResolver === 'string') {
      const resolvers = loadFromModuleExportExpressionSync<any>(additionalResolver, {
        cwd: baseDir,
        defaultExportName: 'resolvers',
        syncImportFn,
      });

      if (!resolvers) {
        console.warn(`Unable to load resolvers from file: ${additionalResolver}`);

        return {};
      }

      return resolvers;
    } else {
      const baseOptions: any = {};
      if (additionalResolver.result) {
        baseOptions.valuesFromResults = generateValuesFromResults(additionalResolver.result);
      }
      if ('pubsubTopic' in additionalResolver) {
        return {
          [additionalResolver.targetTypeName]: {
            [additionalResolver.targetFieldName]: {
              subscribe: withFilter(
                (root, args, context, info) => {
                  const resolverData = { root, args, context, info, env };
                  const topic = stringInterpolator.parse(additionalResolver.pubsubTopic, resolverData);
                  return pubsub.asyncIterator(topic);
                },
                (root, args, context, info) => {
                  return additionalResolver.filterBy ? eval(additionalResolver.filterBy) : true;
                }
              ),
              resolve: (payload: any) => {
                if (baseOptions.valuesFromResults) {
                  return baseOptions.valuesFromResults(payload);
                }
                return payload;
              },
            },
          },
        };
      } else if ('keysArg' in additionalResolver) {
        return {
          [additionalResolver.targetTypeName]: {
            [additionalResolver.targetFieldName]: {
              selectionSet: additionalResolver.requiredSelectionSet || `{ ${additionalResolver.keyField} }`,
              resolve: async (root: any, args: any, context: any, info: any) => {
                if (!baseOptions.selectionSet) {
                  baseOptions.selectionSet = generateSelectionSetFactory(info.schema, additionalResolver);
                }
                const resolverData = { root, args, context, info, env };
                const targetArgs: any = {};
                for (const argPath in additionalResolver.additionalArgs || {}) {
                  _.set(
                    targetArgs,
                    argPath,
                    stringInterpolator.parse(additionalResolver.additionalArgs[argPath], resolverData)
                  );
                }
                const options: any = {
                  ...baseOptions,
                  root,
                  context,
                  info,
                  argsFromKeys: (keys: string[]) => {
                    const args: any = {};
                    _.set(args, additionalResolver.keysArg, keys);
                    Object.assign(args, targetArgs);
                    return args;
                  },
                  key: _.get(root, additionalResolver.keyField),
                };
                return context[additionalResolver.sourceName][additionalResolver.sourceTypeName][
                  additionalResolver.sourceFieldName
                ](options);
              },
            },
          },
        };
      } else {
        return {
          [additionalResolver.targetTypeName]: {
            [additionalResolver.targetFieldName]: {
              selectionSet: additionalResolver.requiredSelectionSet,
              resolve: (root: any, args: any, context: any, info: GraphQLResolveInfo) => {
                if (!baseOptions.selectionSet) {
                  baseOptions.selectionSet = generateSelectionSetFactory(info.schema, additionalResolver);
                }
                const resolverData = { root, args, context, info, env };
                const targetArgs: any = {};
                for (const argPath in additionalResolver.sourceArgs) {
                  _.set(
                    targetArgs,
                    argPath,
                    stringInterpolator.parse(additionalResolver.sourceArgs[argPath].toString(), resolverData)
                  );
                }
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
      }
    }
  });
}
