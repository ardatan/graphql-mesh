import { getOperationsAndFragments } from '@graphql-mesh/utils';
import { Path, addPath, collectFields, createGraphQLError, getDefinedRootType, getDirectives, inspect } from '@graphql-tools/utils';
import { DocumentNode, FieldNode, FragmentDefinitionNode, GraphQLObjectType, GraphQLSchema, Kind, OperationDefinitionNode, getOperationAST, parse } from 'graphql';
import { getFieldDef } from 'graphql/execution/execute';

export function planOperation({
  schema,
  operationDoc,
  operationName,
}: {
  schema: GraphQLSchema;
  operationDoc: DocumentNode;
  operationName?: string;
}) {
  const fragments: Record<string, FragmentDefinitionNode> = {};

  let operation: OperationDefinitionNode | undefined;
  for (const definition of operationDoc.definitions) {
    switch (definition.kind) {
      case Kind.OPERATION_DEFINITION:
        if (operationName == null) {
          if (operation !== undefined) {
            return [
              createGraphQLError(
                'Must provide operation name if query contains multiple operations.',
              ),
            ];
          }
          operation = definition;
        } else if (definition.name?.value === operationName) {
          operation = definition;
        }
        break;
      default:
      // ignore non-executable definitions
    }
  }

  const rootType = getDefinedRootType(schema, operation.operation, [operation]);
  if (rootType == null) {
    createGraphQLError(`Schema is not configured to execute ${operation.operation} operation.`, {
      nodes: operation,
    });
  }

  const { fields: rootFields, patches } = collectFields(schema, fragments, {}, rootType, operation.selectionSet);

  return planFields({
    fields: rootFields,
    path: undefined,
    parentType: rootType,
  })
}

export function planFields({
  schema,
  fields,
  path,
  parentType
}: {
  schema: GraphQLSchema,
  fields: Map<string, Array<FieldNode>>,
  path: Path | undefined,
  parentType: GraphQLObjectType,
}) {
  const plan: Record<string, FieldPlan> = Object.create(null);
  for (const [responseName, fieldNodes] of fields) {
    const fieldPath = addPath(path, responseName, parentType.name);
    const fieldPlan = planField({
      schema,
      parentType,
      fieldNodes,
    });
    plan[responseName] = fieldPlan;
  }
}

export function planField({
  schema,
  parentType,
  fieldNodes,
  parentSubgraph,
}: {
  schema: GraphQLSchema,
  parentType: GraphQLObjectType,
  fieldNodes: Array<FieldNode>,
  parentSubgraph?: string;
}) {
  const fieldPlan = {}
  const fieldDef = getFieldDef(
    schema,
    parentType,
    fieldNodes[0],
  );
  if (!fieldDef) {
    return;
  }

  const directives = getDirectives(schema, fieldDef);
  let sourceDirective: DirectiveAnnotation<SourceDirectiveArgs> | undefined;
  if (parentSubgraph) {
    sourceDirective = directives.find(directive => directive.name === 'source' && directive.args.subgraph === parentSubgraph);
  }
  const fieldSourceInfo: FieldSourceInfo = {
    subgraph: sourceDirective.args.subgraph || parentSubgraph,
    name: sourceDirective.args.name || fieldDef.name,
    type: sourceDirective.args.type || fieldDef.type.toString(),
  };

  if (!sourceDirective) {
    // Check if there is a field resolver suitable for the parent subgraph
    const fieldResolverDirectives: DirectiveAnnotation<ResolverDirectiveArgs>[] = directives.filter(directive => directive.name === 'resolver');
    const typeDirectives = getDirectives(schema, parentType);
    const typeVariableDirectives: DirectiveAnnotation<VariableDirectiveArgs>[] = typeDirectives.filter(directive => directive.name === 'variable' && directive.args.subgraph === parentSubgraph);
    const fieldVariableDirectives: DirectiveAnnotation<VariableDirectiveArgs>[] = directives.filter(directive => directive.name === 'variable' && directive.args.subgraph === parentSubgraph);
    for (const fieldResolverDirective of fieldResolverDirectives) {
      const resolverOperationStr = fieldResolverDirective.args?.operation;
      const resolverOperation = parse(resolverOperationStr);
      const resolverOpAST = getOperationAST(resolverOperation, resolverOperationStr);
      if (!resolverOpAST) {
        throw new Error(`Invalid operation in the resolver directive ${inspect(fieldResolverDirective)}: ${resolverOperationStr} in ${parentType.name}.${fieldDef.name}`);
      }
      let okForSubgraph = true;
      if (resolverOpAST.variableDefinitions) {
        for (const resolverOperationVariableDef of resolverOpAST.variableDefinitions) {
          const variableType = resolverOperationVariableDef.type;
          if (fieldResolverDirective.args?.kind === 'BATCH') {
            if (variableType.kind === Kind.LIST_TYPE && variableType.type.kind === Kind.NON_NULL_TYPE) {
              okForSubgraph = false;
              break;
            }
          }
          if (variableType.kind === Kind.NON_NULL_TYPE) {

          }
        }
      }
    }
  } else {
    fieldPlan.fieldNameOnParent = fieldSourceInfo.name;
  }


  const returnType = fieldDef.type;
}

export interface FieldSourceInfo {
  subgraph: string;
  name: string;
  type: string;
}

export interface DirectiveAnnotation<TArgs extends Record<string, any>> {
  name: string;
  args?: TArgs;
}

export interface SourceDirectiveArgs {
  subgraph?: string;
  name?: string;
  type?: string;
}

export interface ResolverDirectiveArgs {
  subgraph?: string;
  operation?: string;
  kind?: 'FETCH' | 'BATCH';
}

export interface VariableDirectiveArgs {
  subgraph?: string;
  name?: string;
  select?: string;
  value?: string;
}
