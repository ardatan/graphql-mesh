import jsonpatch from 'fast-json-patch';
import {
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLError,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
  valueFromASTUntyped,
  VariableDefinitionNode,
} from 'graphql';
import { getRootTypeMap, isAsyncIterable, isPromise, mapAsyncIterator } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import {
  createExecutableResolverOperationNodesWithDependencyMap,
  ExecutableResolverOperationNode,
  executeResolverOperationNodesWithDependenciesInParallel,
  OnExecuteFn,
} from './execution.js';
import { FlattenedFieldNode, flattenSelections } from './flattenSelections.js';
import { ResolverOperationNode, visitFieldNodeForTypeResolvers } from './query-planning.js';
import {
  SerializedResolverOperationNode,
  serializeExecutableResolverOperationNode,
} from './serialization.js';

export function planOperation(
  fusiongraph: GraphQLSchema,
  document: DocumentNode,
  operationName?: string,
) {
  let operationAst: OperationDefinitionNode | undefined;
  const fragments: Record<string, FragmentDefinitionNode> = Object.create(null);
  for (const definition of document.definitions) {
    if (definition.kind === 'OperationDefinition') {
      if (!operationName && operationAst) {
        throw new Error('Must provide operation name if query contains multiple operations');
      }
      if (!operationName || definition.name?.value === operationName) {
        operationAst = definition;
      }
    } else if (definition.kind === 'FragmentDefinition') {
      fragments[definition.name.value] = definition;
    }
  }

  if (!operationAst) {
    throw new Error(`No operation found with name ${operationName}`);
  }

  const defaultVariables: Record<string, any> = Object.create(null);
  operationAst.variableDefinitions?.forEach(variableDefinition => {
    if (variableDefinition.defaultValue) {
      defaultVariables[variableDefinition.variable.name.value] = valueFromASTUntyped(
        variableDefinition.defaultValue,
        defaultVariables,
      );
    }
  });

  const flattenedFakeFieldNode: FlattenedFieldNode = {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: '__fake',
    },
    arguments: operationAst.variableDefinitions?.map(variableDefinition => ({
      kind: Kind.ARGUMENT,
      name: variableDefinition.variable.name,
      value: {
        kind: Kind.VARIABLE,
        name: variableDefinition.variable.name,
      },
    })),
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: flattenSelections(operationAst.selectionSet.selections, fragments),
    },
  };

  const rootTypeMap = getRootTypeMap(fusiongraph);
  const operationType = operationAst.operation;
  const rootType = rootTypeMap.get(operationType);
  if (!rootType) {
    throw new Error(`No root type found for operation type ${operationType}`);
  }

  const rootVariableMap = new Map<string, VariableDefinitionNode>();

  for (const variableDefinition of operationAst.variableDefinitions || []) {
    rootVariableMap.set(variableDefinition.variable.name.value, variableDefinition);
  }

  const planForFakeFieldNode = visitFieldNodeForTypeResolvers(
    'ROOT',
    flattenedFakeFieldNode,
    rootType,
    fusiongraph,
    {
      currentVariableIndex: 0,
      rootVariableMap,
    },
  );
  return {
    resolverOperationNodes: planForFakeFieldNode.resolverOperationNodes,
    resolverDependencyFieldMap: planForFakeFieldNode.resolverDependencyFieldMap,
    defaultVariables,
  };
}

export interface ExecutableOperationPlan {
  resolverOperationNodes: ExecutableResolverOperationNode[];
  resolverDependencyFieldMap: Map<string, ExecutableResolverOperationNode[]>;
  defaultVariables: Record<string, any>;
}

export interface NonExecutableOperationPlan {
  resolverOperationNodes: ResolverOperationNode[];
  resolverDependencyFieldMap: Map<string, ResolverOperationNode[]>;
  defaultVariables: Record<string, any>;
}

export interface SerializableOperationPlan {
  resolverOperationNodes: SerializedResolverOperationNode[];
  resolverDependencyFieldMap: Map<string, SerializedResolverOperationNode[]>;
  defaultVariables: Record<string, any>;
}

export function executeOperation({
  fusiongraph,
  onExecute,
  document,
  operationName,
  variables = {},
  context = {},
}: {
  fusiongraph: GraphQLSchema;
  onExecute: OnExecuteFn;
  document: DocumentNode;
  operationName?: string;
  variables?: Record<string, any>;
  context?: any;
}) {
  const executablePlan = createExecutablePlanForOperation({ fusiongraph, document, operationName });
  return executeOperationPlan({ executablePlan, onExecute, variables, context });
}

export function executeOperationWithPatches({
  fusiongraph,
  onExecute,
  document,
  operationName,
  variables = {},
  context = {},
}: {
  fusiongraph: GraphQLSchema;
  onExecute: OnExecuteFn;
  document: DocumentNode;
  operationName?: string;
  variables?: Record<string, any>;
  context?: any;
}) {
  const executablePlan = createExecutablePlanForOperation({ fusiongraph, document, operationName });
  return executeOperationPlanWithPatches({ executablePlan, onExecute, variables, context });
}

export function createExecutablePlanForOperation({
  fusiongraph,
  document,
  operationName,
}: {
  fusiongraph: GraphQLSchema;
  document: DocumentNode;
  operationName?: string;
}): ExecutableOperationPlan {
  const plan = planOperation(fusiongraph, document, operationName);
  const executablePlan = createExecutableResolverOperationNodesWithDependencyMap(
    plan.resolverOperationNodes,
    plan.resolverDependencyFieldMap,
    0,
  );
  return {
    resolverOperationNodes: executablePlan.resolverOperationNodes,
    resolverDependencyFieldMap: executablePlan.resolverDependencyFieldMap,
    defaultVariables: plan.defaultVariables,
  };
}

function removeInternalFieldsFromResponse(response: any): any {
  if (Array.isArray(response)) {
    return response.map(removeInternalFieldsFromResponse);
  } else if (
    typeof response === 'object' &&
    response != null &&
    (!response.constructor || response.constructor.name === 'Object')
  ) {
    return Object.fromEntries(
      Object.entries(response)
        .filter(([key]) => !key.startsWith('__variable'))
        .map(([key, value]) => [key, removeInternalFieldsFromResponse(value)]),
    );
  } else {
    return response;
  }
}

function prepareExecutionResult(
  planExecutionResult: { exported: any; outputVariableMap: Map<string, any> },
  errors: GraphQLError[],
  executionPlan: ExecutableOperationPlan,
) {
  return {
    data:
      planExecutionResult?.exported != null
        ? removeInternalFieldsFromResponse(planExecutionResult.exported)
        : undefined,
    errors: errors.length > 0 ? errors : undefined,
    extensions: globalThis.process?.env?.DEBUG
      ? {
          executionPlan: serializeExecutableOperationPlan(executionPlan),
          outputVariables: Object.fromEntries(planExecutionResult?.outputVariableMap || []),
        }
      : undefined,
  };
}

export function executeOperationPlanWithPatches(
  params: Parameters<typeof executeOperationPlan>[0],
) {
  return new Repeater(async function (push, stop) {
    try {
      const resMaybeAsyncIter = await executeOperationPlan(params);
      if (isAsyncIterable(resMaybeAsyncIter)) {
        let lastRes: any;
        for await (const res of resMaybeAsyncIter) {
          if (!lastRes) {
            await push({
              ...res,
              hasNext: true,
            });
          } else {
            const patches = jsonpatch.compare(lastRes, res);
            for (const patch of patches) {
              if (patch.op === 'add' || patch.op === 'replace') {
                const [, ...pathForGraphQL] = patch.path.split('/');
                await push({
                  ...res,
                  path: pathForGraphQL,
                  data: patch.value,
                  hasNext: true,
                });
              }
            }
          }
          lastRes = res;
        }
        await push({
          hasNext: false,
        });
      } else {
        await push({
          ...resMaybeAsyncIter,
          hasNext: false,
        });
      }
      await stop();
    } catch (e) {
      await stop(e);
    }
  });
}

export function executeOperationPlan({
  executablePlan,
  onExecute,
  variables = {},
  context,
}: {
  executablePlan: ExecutableOperationPlan;
  onExecute: OnExecuteFn;
  variables?: Record<string, any>;
  context: any;
}) {
  const errors: GraphQLError[] = [];
  const res$ = executeResolverOperationNodesWithDependenciesInParallel({
    context,
    resolverOperationNodes: executablePlan.resolverOperationNodes,
    fieldDependencyMap: executablePlan.resolverDependencyFieldMap,
    inputVariableMap: new Map([
      ...Object.entries(executablePlan.defaultVariables),
      ...Object.entries(variables),
    ]),
    onExecute,
    path: [],
    errors,
  });
  if (isPromise(res$)) {
    return res$.then(res => prepareExecutionResult(res, errors, executablePlan));
  }
  if (isAsyncIterable(res$)) {
    return mapAsyncIterator(res$, res => prepareExecutionResult(res, errors, executablePlan));
  }
  return prepareExecutionResult(res$, errors, executablePlan);
}

export function serializeExecutableOperationPlan(executablePlan: ExecutableOperationPlan) {
  return {
    resolverOperationNodes: executablePlan.resolverOperationNodes.map(node =>
      serializeExecutableResolverOperationNode(node),
    ),
    resolverDependencyFieldMap: Object.fromEntries(
      [...executablePlan.resolverDependencyFieldMap.entries()].map(([key, value]) => [
        key,
        value.map(serializeExecutableResolverOperationNode),
      ]),
    ),
  };
}
