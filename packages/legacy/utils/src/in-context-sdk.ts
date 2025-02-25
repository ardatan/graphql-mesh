import type {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLSchema,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode,
} from 'graphql';
import { getNamedType, isLeafType, Kind, print } from 'graphql';
import type {
  Logger,
  OnDelegateHook,
  OnDelegateHookDone,
  OnDelegateHookPayload,
  RawSourceOutput,
  SelectionSetParam,
  SelectionSetParamOrFactory,
} from '@graphql-mesh/types';
import type { BatchDelegateOptions } from '@graphql-tools/batch-delegate';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';
import type {
  IDelegateToSchemaOptions,
  StitchingInfo,
  SubschemaConfig,
} from '@graphql-tools/delegate';
import { applySchemaTransforms, delegateToSchema } from '@graphql-tools/delegate';
import { buildOperationNodeForField, isDocumentNode, memoize1 } from '@graphql-tools/utils';
import { WrapQuery } from '@graphql-tools/wrap';
import { handleMaybePromise, iterateAsync } from '@whatwg-node/promise-helpers';
import { parseWithCache } from './parseAndPrintWithCache.js';

export const MESH_API_CONTEXT_SYMBOL = Symbol('isMeshAPIContext');

export function getInContextSDK(
  unifiedSchema: GraphQLSchema,
  rawSources: RawSourceOutput[],
  logger: Logger,
  onDelegateHooks: OnDelegateHook<any>[],
) {
  const inContextSDK: Record<string, any> = {};
  const sourceMap = unifiedSchema.extensions.sourceMap as Map<RawSourceOutput, GraphQLSchema>;
  for (const rawSource of rawSources) {
    const rawSourceLogger = logger?.child({ source: rawSource.name });

    const rawSourceContext: any = {
      rawSource,
      [MESH_API_CONTEXT_SYMBOL]: true,
    };
    // TODO: Somehow rawSource reference got lost in somewhere
    let rawSourceSubSchemaConfig: SubschemaConfig = rawSource;
    const stitchingInfo = unifiedSchema.extensions.stitchingInfo as StitchingInfo;
    if (stitchingInfo) {
      for (const [subschemaConfig, subschema] of stitchingInfo.subschemaMap) {
        if ((subschemaConfig as any).name === rawSource.name) {
          rawSourceSubSchemaConfig = subschema;
          break;
        }
      }
    }
    // If there is a single source, there is no unifiedSchema
    const transformedSchema =
      sourceMap?.get(rawSource) || applySchemaTransforms(rawSource.schema, rawSource);
    const rootTypes: Record<OperationTypeNode, GraphQLObjectType> = {
      query: transformedSchema.getQueryType(),
      mutation: transformedSchema.getMutationType(),
      subscription: transformedSchema.getSubscriptionType(),
    };

    rawSourceLogger?.debug(`Generating In Context SDK`);
    for (const operationType in rootTypes) {
      const rootType: GraphQLObjectType = rootTypes[operationType as OperationTypeNode];
      if (rootType) {
        rawSourceContext[rootType.name] = {};
        const rootTypeFieldMap = rootType.getFields();
        for (const fieldName in rootTypeFieldMap) {
          const rootTypeField = rootTypeFieldMap[fieldName];
          const inContextSdkLogger = rawSourceLogger?.child({
            inContextSdk: `${rootType.name}.${fieldName}`,
          });
          const namedReturnType = getNamedType(rootTypeField.type);
          const shouldHaveSelectionSet = !isLeafType(namedReturnType);
          rawSourceContext[rootType.name][fieldName] = ({
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
            autoSelectionSetWithDepth,
          }: {
            root: any;
            args: any;
            context: any;
            info: GraphQLResolveInfo;
            selectionSet: SelectionSetParamOrFactory;
            key?: string;
            argsFromKeys?: (keys: string[]) => any;
            valuesFromResults?: (result: any, keys?: string[]) => any;
            autoSelectionSetWithDepth?: number;
          }) => {
            inContextSdkLogger?.debug(`Called with`, {
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
              transforms: [],
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
                  if (autoSelectionSetWithDepth) {
                    const operationNode = buildOperationNodeForField({
                      schema: transformedSchema,
                      kind: operationType as OperationTypeNode,
                      depthLimit: autoSelectionSetWithDepth,
                      field: fieldName,
                    });
                    selectionSet = print(
                      (operationNode.selectionSet.selections[0] as FieldNode).selectionSet,
                    );
                  } else {
                    throw new Error(
                      `You have to provide 'selectionSet' for context.${rawSource.name}.${rootType.name}.${fieldName}`,
                    );
                  }
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
              const onDelegatePayload: OnDelegateHookPayload<any> = {
                ...batchDelegationOptions,
                sourceName: rawSource.name,
                typeName: rootType.name,
                fieldName,
              };
              fixInfo(batchDelegationOptions.info, operationType as OperationTypeNode);
              return handleMaybePromise(
                () =>
                  iterateAsync(
                    onDelegateHooks,
                    onDelegateHook => onDelegateHook(onDelegatePayload),
                    onDelegateHookDones,
                  ),
                () =>
                  handleIterationResult(
                    batchDelegateToSchema,
                    batchDelegationOptions,
                    onDelegateHookDones,
                  ),
              );
            } else {
              const regularDelegateOptions: IDelegateToSchemaOptions = {
                ...commonDelegateOptions,
                args,
              };
              if (selectionSet) {
                const selectionSetFactory = normalizeSelectionSetParamOrFactory(selectionSet);
                const path = [fieldName];
                const wrapQueryTransform = new WrapQuery(
                  path,
                  selectionSetFactory,
                  valuesFromResults || identical,
                );
                regularDelegateOptions.transforms = [wrapQueryTransform as any];
              }
              const onDelegateHookDones: OnDelegateHookDone[] = [];
              const onDelegatePayload: OnDelegateHookPayload<any> = {
                ...regularDelegateOptions,
                sourceName: rawSource.name,
                typeName: rootType.name,
                fieldName,
              };
              fixInfo(regularDelegateOptions.info, operationType as OperationTypeNode);
              return handleMaybePromise(
                () =>
                  iterateAsync(
                    onDelegateHooks,
                    onDelegateHook => onDelegateHook(onDelegatePayload),
                    onDelegateHookDones,
                  ),
                () =>
                  handleIterationResult(
                    delegateToSchema,
                    regularDelegateOptions,
                    onDelegateHookDones,
                  ),
              );
            }
          };
        }
      }
    }
    inContextSDK[rawSource.name] = rawSourceContext;
  }
  return inContextSDK;
}

function getSelectionSetFromDocumentNode(documentNode: DocumentNode): SelectionSetNode {
  const operationDefinition = documentNode.definitions.find(
    definition => definition.kind === Kind.OPERATION_DEFINITION,
  ) as OperationDefinitionNode;
  if (!operationDefinition) {
    throw new Error('DocumentNode must contain an OperationDefinitionNode');
  }
  return operationDefinition.selectionSet;
}

function normalizeSelectionSetParam(selectionSetParam: SelectionSetParam): SelectionSetNode {
  if (typeof selectionSetParam === 'string') {
    const documentNode = parseWithCache(selectionSetParam);
    return getSelectionSetFromDocumentNode(documentNode);
  }
  if (isDocumentNode(selectionSetParam)) {
    return getSelectionSetFromDocumentNode(selectionSetParam);
  }
  return selectionSetParam;
}

const normalizeSelectionSetParamFactory = memoize1(function normalizeSelectionSetParamFactory(
  selectionSetParamFactory: (subtree: SelectionSetNode) => SelectionSetParam,
) {
  const memoizedSelectionSetFactory = memoize1(selectionSetParamFactory);
  return function selectionSetFactory(subtree: SelectionSetNode) {
    const selectionSetParam = memoizedSelectionSetFactory(subtree);
    return normalizeSelectionSetParam(selectionSetParam);
  };
});

function normalizeSelectionSetParamOrFactory(
  selectionSetParamOrFactory: SelectionSetParamOrFactory,
): (subtree: SelectionSetNode) => SelectionSetNode {
  if (typeof selectionSetParamOrFactory === 'function') {
    return normalizeSelectionSetParamFactory(selectionSetParamOrFactory);
  }
  return () => normalizeSelectionSetParam(selectionSetParamOrFactory);
}

function identical<T>(val: T): T {
  return val;
}

function handleIterationResult<TDelegateFn extends (...args: any) => any>(
  delegateFn: TDelegateFn,
  delegateOptions: Parameters<TDelegateFn>[0],
  onDelegateHookDones: OnDelegateHookDone[],
) {
  return handleMaybePromise(
    () => delegateFn(delegateOptions),
    delegationResult =>
      handleMaybePromise(
        () =>
          iterateAsync(onDelegateHookDones, onDelegateHookDone =>
            onDelegateHookDone({
              result: delegationResult,
              setResult(newResult: any) {
                delegationResult = newResult;
              },
            }),
          ),
        () => delegationResult,
      ),
  );
}

function fixInfo(info: GraphQLResolveInfo, operationType: OperationTypeNode) {
  (info.operation as OperationDefinitionNode) ||= {
    kind: Kind.OPERATION_DEFINITION,
    operation: operationType as OperationTypeNode,
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [],
    },
  };
  (info.operation.selectionSet as SelectionSetNode) ||= {
    kind: Kind.SELECTION_SET,
    selections: [],
  };
  info.operation.selectionSet.selections ||= [];
  (info.operation.selectionSet.selections[0] as SelectionNode) ||= {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: '__typename',
    },
  } as FieldNode;
  ((info.operation.selectionSet.selections[0] as FieldNode).arguments as ArgumentNode[]) ||= [];
}
