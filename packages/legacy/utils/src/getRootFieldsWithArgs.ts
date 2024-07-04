import type {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLFieldMap,
  GraphQLSchema,
  SelectionNode,
} from 'graphql';
import { getArgumentValues, getVariableValues, GraphQLError, Kind } from 'graphql';
import type { ExecutionRequest } from '@graphql-tools/utils';
import { getRootTypeMap } from '@graphql-tools/utils';
import { getOperationsAndFragments } from './getOperationsAndFragments.js';

export function getRootFieldsWithArgs(schema: GraphQLSchema, executionRequest: ExecutionRequest) {
  const rootTypeMap = getRootTypeMap(schema);
  const { document, variables, operationName } = executionRequest;
  const { operations, fragments } = getOperationsAndFragments(document);
  const actualOperationName = operationName || Object.keys(operations)[0];
  const operation = operations[actualOperationName];
  if (!operation) {
    throw new GraphQLError(`No operation found with name ${actualOperationName}`);
  }
  const operationType = operation.operation;
  const rootType = rootTypeMap.get(operationType);
  if (!rootType) {
    throw new GraphQLError(`No root type found for operation type ${operationType}`);
  }
  const rootFieldMap = rootType.getFields();
  const rootFieldsWithArgs = new Map<string, Record<string, any>>();
  const coercedVariables = getVariableValues(
    schema,
    operation.variableDefinitions || [],
    variables || {},
  );
  if (coercedVariables.errors) {
    throw new AggregateError(coercedVariables.errors);
  }
  const selectionHandlerCtx: SelectionHandlerCtx = {
    rootFieldMap,
    rootFieldsWithArgs,
    fragments,
    variables: coercedVariables.coerced,
  };
  for (const selection of operation.selectionSet.selections) {
    handleSelection(selection, selectionHandlerCtx);
  }
  return rootFieldsWithArgs;
}

interface SelectionHandlerCtx {
  rootFieldMap: GraphQLFieldMap<any, any>;
  rootFieldsWithArgs: Map<string, Record<string, any>>;
  fragments: Record<string, FragmentDefinitionNode>;
  variables: Record<string, any>;
}

function handleFieldNode(fieldNode: FieldNode, ctx: SelectionHandlerCtx) {
  const originalFieldName = fieldNode.name.value;
  if (originalFieldName === '__typename') {
    ctx.rootFieldsWithArgs.set(originalFieldName, {});
    return;
  }
  const rootField = ctx.rootFieldMap[originalFieldName];
  if (!rootField) {
    throw new GraphQLError(`No root field found for field ${originalFieldName}`);
  }
  const args = getArgumentValues(rootField, fieldNode, ctx.variables);
  ctx.rootFieldsWithArgs.set(originalFieldName, args);
}
function handleSelection(selection: SelectionNode, ctx: SelectionHandlerCtx) {
  switch (selection.kind) {
    case Kind.FIELD: {
      handleFieldNode(selection, ctx);
      break;
    }
    case Kind.FRAGMENT_SPREAD: {
      const fragmentName = selection.name.value;
      const fragment = ctx.fragments[fragmentName];
      if (!fragment) {
        throw new GraphQLError(`Fragment ${fragmentName} not found`);
      }
      for (const fragmentSelection of fragment.selectionSet.selections) {
        handleSelection(fragmentSelection, ctx);
      }
      break;
    }
    case Kind.INLINE_FRAGMENT: {
      for (const inlineSelection of selection.selectionSet.selections) {
        handleSelection(inlineSelection, ctx);
      }
      break;
    }
  }
}
