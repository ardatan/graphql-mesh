import { YamlConfig, MeshPubSub, SyncImportFn } from '@graphql-mesh/types';
import { IResolvers, parseSelectionSet } from '@graphql-tools/utils';
import { GraphQLResolveInfo, SelectionSetNode, Kind } from 'graphql';
import { withFilter } from 'graphql-subscriptions';
import _ from 'lodash';
import { stringInterpolator } from './string-interpolator';
import { loadFromModuleExportExpressionSync } from './load-from-module-export-expression';
import { env } from 'process';

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
                if (additionalResolver.result) {
                  return _.get(payload, additionalResolver.result);
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
                const resolverData = { root, args, context, info, env };
                const targetArgs: any = {};
                for (const argPath in additionalResolver.additionalArgs || {}) {
                  _.set(
                    targetArgs,
                    argPath,
                    stringInterpolator.parse(additionalResolver.additionalArgs[argPath], resolverData)
                  );
                }
                return context[additionalResolver.sourceName][additionalResolver.sourceTypeName][
                  additionalResolver.sourceFieldName
                ]({
                  root,
                  context,
                  info,
                  argsFromKeys: (keys: string[]) => ({
                    [additionalResolver.keysArg]: keys,
                    ...targetArgs,
                  }),
                  key: _.get(root, additionalResolver.keyField),
                });
              },
            },
          },
        };
      } else {
        return {
          [additionalResolver.targetTypeName]: {
            [additionalResolver.targetFieldName]: {
              selectionSet: additionalResolver.requiredSelectionSet,
              resolve: async (root: any, args: any, context: any, info: GraphQLResolveInfo) => {
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
                  root,
                  args: targetArgs,
                  context,
                  info,
                };
                if (additionalResolver.sourceSelectionSet) {
                  options.selectionSet = () => parseSelectionSet(additionalResolver.sourceSelectionSet);
                  // If result path provided without a selectionSet
                } else if (additionalResolver.result) {
                  const resultPathReversed = _.toPath(additionalResolver.result);
                  options.selectionSet = (subtree: SelectionSetNode) => {
                    let finalSelectionSet = subtree;
                    let isLastResult = true;
                    for (const pathElem of resultPathReversed) {
                      // Ensure the path elem is not array index
                      if (Number.isNaN(parseInt(pathElem))) {
                        if (isLastResult && additionalResolver.resultType) {
                          finalSelectionSet = {
                            kind: Kind.SELECTION_SET,
                            selections: [
                              {
                                kind: Kind.INLINE_FRAGMENT,
                                typeCondition: {
                                  kind: Kind.NAMED_TYPE,
                                  name: {
                                    kind: Kind.NAME,
                                    value: additionalResolver.resultType,
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
                const result = await context[additionalResolver.sourceName][additionalResolver.sourceTypeName][
                  additionalResolver.sourceFieldName
                ](options);
                return additionalResolver.result ? _.get(result, additionalResolver.result) : result;
              },
            },
          },
        };
      }
    }
  });
}
