import {
  Logger,
  OnDelegateHook,
  OnDelegateHookDone,
  RawSourceOutput,
  SelectionSetParam,
  SelectionSetParamOrFactory,
} from '@graphql-mesh/types';
import { printWithCache } from '@graphql-mesh/utils';
import { BatchDelegateOptions, batchDelegateToSchema } from '@graphql-tools/batch-delegate';
import { SubschemaConfig, StitchingInfo, IDelegateToSchemaOptions, delegateToSchema } from '@graphql-tools/delegate';
import { parseSelectionSet, isDocumentNode } from '@graphql-tools/utils';
import { WrapQuery } from '@graphql-tools/wrap';
import {
  GraphQLSchema,
  OperationTypeNode,
  GraphQLObjectType,
  getNamedType,
  isLeafType,
  Kind,
  GraphQLResolveInfo,
  SelectionSetNode,
} from 'graphql';
import { MESH_API_CONTEXT_SYMBOL } from './constants';

export async function getInContextSDK(
  unifiedSchema: GraphQLSchema,
  rawSources: RawSourceOutput[],
  logger: Logger,
  onDelegateHooks: OnDelegateHook<any>[]
) {
  const inContextSDK: Record<string, any> = {};
  const sourceMap = unifiedSchema.extensions.sourceMap as Map<RawSourceOutput, GraphQLSchema>;
  for (const rawSource of rawSources) {
    const rawSourceLogger = logger.child(`${rawSource.name}`);

    const rawSourceContext: any = {
      rawSource,
      [MESH_API_CONTEXT_SYMBOL]: true,
    };
    // TODO: Somehow rawSource reference got lost in somewhere
    let rawSourceSubSchemaConfig: SubschemaConfig;
    const stitchingInfo = unifiedSchema.extensions.stitchingInfo as StitchingInfo;
    if (stitchingInfo) {
      for (const [subschemaConfig, subschema] of stitchingInfo.subschemaMap) {
        if ((subschemaConfig as any).name === rawSource.name) {
          rawSourceSubSchemaConfig = subschema;
          break;
        }
      }
    } else {
      rawSourceSubSchemaConfig = rawSource;
    }
    // If there is a single source, there is no unifiedSchema
    const transformedSchema = sourceMap.get(rawSource);
    const rootTypes: Record<OperationTypeNode, GraphQLObjectType> = {
      query: transformedSchema.getQueryType(),
      mutation: transformedSchema.getMutationType(),
      subscription: transformedSchema.getSubscriptionType(),
    };

    rawSourceLogger.debug(`Generating In Context SDK`);
    for (const operationType in rootTypes) {
      const rootType: GraphQLObjectType = rootTypes[operationType];
      if (rootType) {
        rawSourceContext[rootType.name] = {};
        const rootTypeFieldMap = rootType.getFields();
        for (const fieldName in rootTypeFieldMap) {
          const rootTypeField = rootTypeFieldMap[fieldName];
          const inContextSdkLogger = rawSourceLogger.child(`InContextSDK.${rootType.name}.${fieldName}`);
          const namedReturnType = getNamedType(rootTypeField.type);
          const shouldHaveSelectionSet = !isLeafType(namedReturnType);
          rawSourceContext[rootType.name][fieldName] = async ({
            root,
            args,
            context,
            info = {
              fieldName,
              fieldNodes: [],
              returnType: namedReturnType,
              parentType: rootType,
              path: {
                typename: rootType.name,
                key: fieldName,
                prev: undefined,
              },
              schema: transformedSchema,
              fragments: {},
              rootValue: root,
              operation: {
                kind: Kind.OPERATION_DEFINITION,
                operation: operationType as OperationTypeNode,
                selectionSet: {
                  kind: Kind.SELECTION_SET,
                  selections: [],
                },
              },
              variableValues: {},
            },
            selectionSet,
            key,
            argsFromKeys,
            valuesFromResults,
          }: {
            root: any;
            args: any;
            context: any;
            info: GraphQLResolveInfo;
            selectionSet: SelectionSetParamOrFactory;
            key?: string;
            argsFromKeys?: (keys: string[]) => any;
            valuesFromResults?: (result: any, keys?: string[]) => any;
          }) => {
            inContextSdkLogger.debug(`Called with`, {
              args,
              key,
            });
            const commonDelegateOptions: IDelegateToSchemaOptions = {
              schema: rawSourceSubSchemaConfig,
              rootValue: root,
              operation: operationType as OperationTypeNode,
              fieldName,
              context,
              transformedSchema,
              info,
            };
            // If there isn't an extraction of a value
            if (typeof selectionSet !== 'function') {
              commonDelegateOptions.returnType = rootTypeField.type;
            }
            if (shouldHaveSelectionSet) {
              let selectionCount = 0;
              for (const fieldNode of info.fieldNodes) {
                if (fieldNode.selectionSet != null) {
                  selectionCount += fieldNode.selectionSet.selections.length;
                }
              }
              if (selectionCount === 0) {
                if (!selectionSet) {
                  throw new Error(
                    `You have to provide 'selectionSet' for context.${rawSource.name}.${rootType.name}.${fieldName}`
                  );
                }
                commonDelegateOptions.info = {
                  ...info,
                  fieldNodes: [
                    {
                      ...info.fieldNodes[0],
                      selectionSet: {
                        kind: Kind.SELECTION_SET,
                        selections: [
                          {
                            kind: Kind.FIELD,
                            name: {
                              kind: Kind.NAME,
                              value: '__typename',
                            },
                          },
                        ],
                      },
                    },
                    ...info.fieldNodes.slice(1),
                  ],
                };
              }
            }
            if (key && argsFromKeys) {
              const batchDelegationOptions = {
                ...commonDelegateOptions,
                key,
                argsFromKeys,
                valuesFromResults,
              } as unknown as BatchDelegateOptions;
              if (selectionSet) {
                const selectionSetFactory = normalizeSelectionSetParamOrFactory(selectionSet);
                const path = [fieldName];
                const wrapQueryTransform = new WrapQuery(path, selectionSetFactory, identical);
                batchDelegationOptions.transforms = [wrapQueryTransform as any];
              }
              const onDelegateHookDones: OnDelegateHookDone[] = [];
              for (const onDelegateHook of onDelegateHooks) {
                const onDelegateDone = await onDelegateHook({
                  ...batchDelegationOptions,
                  sourceName: rawSource.name,
                  typeName: rootType.name,
                  fieldName,
                });
                if (onDelegateDone) {
                  onDelegateHookDones.push(onDelegateDone);
                }
              }
              let result = await batchDelegateToSchema(batchDelegationOptions);
              for (const onDelegateHookDone of onDelegateHookDones) {
                await onDelegateHookDone({
                  result,
                  setResult(newResult) {
                    result = newResult;
                  },
                });
              }
              return result;
            } else {
              const regularDelegateOptions: IDelegateToSchemaOptions = {
                ...commonDelegateOptions,
                args,
              };
              if (selectionSet) {
                const selectionSetFactory = normalizeSelectionSetParamOrFactory(selectionSet);
                const path = [fieldName];
                const wrapQueryTransform = new WrapQuery(path, selectionSetFactory, valuesFromResults || identical);
                regularDelegateOptions.transforms = [wrapQueryTransform as any];
              }
              const onDelegateHookDones: OnDelegateHookDone[] = [];
              for (const onDelegateHook of onDelegateHooks) {
                const onDelegateDone = await onDelegateHook({
                  ...regularDelegateOptions,
                  sourceName: rawSource.name,
                  typeName: rootType.name,
                  fieldName,
                });
                if (onDelegateDone) {
                  onDelegateHookDones.push(onDelegateDone);
                }
              }
              let result = await delegateToSchema(regularDelegateOptions);
              for (const onDelegateHookDone of onDelegateHookDones) {
                await onDelegateHookDone({
                  result,
                  setResult(newResult) {
                    result = newResult;
                  },
                });
              }
              return result;
            }
          };
        }
      }
    }
    inContextSDK[rawSource.name] = rawSourceContext;
  }
  return inContextSDK;
}

function normalizeSelectionSetParam(selectionSetParam: SelectionSetParam) {
  if (typeof selectionSetParam === 'string') {
    return parseSelectionSet(selectionSetParam);
  }
  if (isDocumentNode(selectionSetParam)) {
    return parseSelectionSet(printWithCache(selectionSetParam));
  }
  return selectionSetParam;
}

function normalizeSelectionSetParamOrFactory(
  selectionSetParamOrFactory: SelectionSetParamOrFactory
): (subtree: SelectionSetNode) => SelectionSetNode {
  return function getSelectionSet(subtree: SelectionSetNode) {
    if (typeof selectionSetParamOrFactory === 'function') {
      const selectionSetParam = selectionSetParamOrFactory(subtree);
      return normalizeSelectionSetParam(selectionSetParam);
    } else {
      return normalizeSelectionSetParam(selectionSetParamOrFactory);
    }
  };
}

function identical<T>(val: T): T {
  return val;
}
