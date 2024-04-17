import {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  getNamedType,
  getOperationAST,
  GraphQLField,
  GraphQLList,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  isAbstractType,
  isCompositeType,
  isNonNullType,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  parse,
} from 'graphql';
import { getFieldDef } from 'graphql/execution/execute';
import { getOperationsAndFragments } from '@graphql-mesh/utils';
import {
  addPath,
  collectFields,
  collectSubFields,
  createGraphQLError,
  getDefinedRootType,
  getDirectives,
  inspect,
  memoize2,
  Path,
} from '@graphql-tools/utils';
import { getDefDirectives } from '../getDefDirectives';

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

  const { fields: rootFields } = collectFields(
    schema,
    fragments,
    {},
    rootType,
    operation.selectionSet,
  );

  const fieldPlans = planFields({
    schema,
    fields: rootFields,
    parentType: rootType,
    fragments,
  });

  for (const fieldName in fieldPlans) {
    const fieldPlan = fieldPlans[fieldName];
    if (!('fieldResolverDirective' in fieldPlan)) {
      throw new Error(`Root field ${fieldName} must have a resolver directive`);
    }
    if (fieldPlan.fieldsForTypes) {
      for (const typeName in fieldPlan.fieldsForTypes) {
        const subfieldPlansForType = fieldPlan.fieldsForTypes[typeName];
        const leafFieldsForThisType = new Set();
        const typeResolversBySubgraph: Record<string, string> = Object.create(null);
        for (const subfieldName in subfieldPlansForType) {
          const subfieldPlan = subfieldPlansForType[subfieldName];

          if ('variableDirectivesForFieldResolver' in subfieldPlan) {
            for (const varDirectivesForField of subfieldPlan.variableDirectivesForFieldResolver) {
              if (varDirectivesForField.args.select) {
                leafFieldsForThisType.add(varDirectivesForField.args.select);
              } else if (varDirectivesForField.args.value) {
                throw new Error(`Not implemented`);
              }
            }
          } else if ('variableDirectivesForTypeResolver' in subfieldPlan) {
            for (const varDirectivesForType of subfieldPlan.variableDirectivesForTypeResolver) {
              if (varDirectivesForType.args.select) {
                leafFieldsForThisType.add(varDirectivesForType.args.select);
              } else if (varDirectivesForType.args.value) {
                throw new Error(`Not implemented`);
              }
            }
          } else {
            if (!subfieldPlan.fieldsForTypes) {
              leafFieldsForThisType.add(subfieldPlan.fieldName);
            }
          }
        }
      }
    }
  }
}

export function planFields({
  schema,
  fields,
  parentType,
  fragments,
}: {
  schema: GraphQLSchema;
  fields: Map<string, Array<FieldNode>>;
  parentType: GraphQLObjectType;
  fragments: Record<string, FragmentDefinitionNode>;
}) {
  const plan: Record<string, FieldPlan> = Object.create(null);
  for (const [responseName, fieldNodes] of fields) {
    plan[responseName] = planField({
      schema,
      parentType,
      fieldNodes,
      fragments,
    });
  }
  return plan;
}

export function planField({
  schema,
  parentType,
  fieldNodes,
  parentSubgraph,
  fragments,
}: {
  schema: GraphQLSchema;
  parentType: GraphQLObjectType;
  fieldNodes: Array<FieldNode>;
  parentSubgraph?: string;
  fragments: Record<string, FragmentDefinitionNode>;
}): FieldPlan {
  const fieldDef = getFieldDef(schema, parentType, fieldNodes[0]);
  if (!fieldDef) {
    return;
  }

  const fieldArgs = fieldNodes[0].arguments;

  const fieldDirectives = getDefDirectives(fieldDef);
  let sourceDirective: DirectiveAnnotation<SourceDirectiveArgs> | undefined;
  if (parentSubgraph) {
    sourceDirective = fieldDirectives.find(
      directive => directive.name === 'source' && directive.args.subgraph === parentSubgraph,
    );
  }

  if (!sourceDirective) {
    const typeDirectives = getDefDirectives(parentType);
    const typeVariableDirectives: DirectiveAnnotation<VariableDirectiveArgs>[] =
      typeDirectives.filter(
        directive => directive.name === 'variable' && directive.args.subgraph === parentSubgraph,
      );
    const fieldVariableDirectives: DirectiveAnnotation<VariableDirectiveArgs>[] = fieldDirectives.filter(
      directive => directive.name === 'variable' && directive.args.subgraph === parentSubgraph,
    );

    // Check if there is a field resolver suitable for the parent subgraph
    const fieldResolverDirectives: DirectiveAnnotation<ResolverDirectiveArgs>[] = fieldDirectives.filter(
      directive => directive.name === 'resolver',
    );
    const foundResolver = findResolver({
      resolverDirectives: fieldResolverDirectives,
      variableDirectives: typeVariableDirectives.concat(fieldVariableDirectives),
      fieldArgs,
    });
    if (foundResolver) {
      const { resolverDirective: fieldResolverDirective, variableDirectivesForResolver: variableDirectivesForFieldResolver } = foundResolver;
      const sourceDirectiveForResolverSubgraph = fieldDirectives.find(
        directive => directive.name === 'source' && directive.args.subgraph === fieldResolverDirective.args.subgraph,
      );
      return {
        fieldName: sourceDirectiveForResolverSubgraph.args.name || fieldDef.name,
        fieldArgs,
        fieldResolverDirective,
        variableDirectivesForFieldResolver,
        list: isListType(fieldDef.type),
        ...planSubfields({
          schema,
          fragments,
          fieldNodes,
          fieldSubgraph: fieldResolverDirective.args.subgraph,
          fieldDef,
        }),
      }
    }

    // Then check if there is a type resolver suitable for the parent subgraph
    const sourceDirectivesForField: DirectiveAnnotation<SourceDirectiveArgs>[] = fieldDirectives.filter(
      directive => directive.name === 'source',
    );
    for (const sourceDirective of sourceDirectivesForField) {
      const resolverDirectivesForSubgraph: DirectiveAnnotation<ResolverDirectiveArgs>[] = typeDirectives.filter(
        directive => directive.name === 'resolver' && directive.args.subgraph === sourceDirective.args.subgraph,
      );
      const foundResolver = findResolver({
        resolverDirectives: resolverDirectivesForSubgraph,
        variableDirectives: typeVariableDirectives.concat(fieldVariableDirectives),
        fieldArgs,
      });
      if (foundResolver) {
        const { resolverDirective: typeResolverDirective, variableDirectivesForResolver: variableDirectivesForTypeResolver } = foundResolver;

        if (typeResolverDirective) {
          return {
            fieldName: sourceDirective.args.name || fieldDef.name,
            fieldArgs,
            typeResolverDirective,
            variableDirectivesForTypeResolver,
            list: isListType(fieldDef.type),
            ...planSubfields({
              schema,
              fragments,
              fieldNodes,
              fieldSubgraph: typeResolverDirective.args.subgraph,
              fieldDef,
            }),
          }
        }
      }
    }

    throw new Error(`No resolver found for field ${fieldDef.name} of type ${parentType.name} in subgraph ${parentSubgraph}`)
  }

  return {
    fieldName: sourceDirective?.args?.name || fieldDef.name,
    fieldArgs,
    ...planSubfields({
      schema,
      fragments,
      fieldNodes,
      fieldSubgraph: parentSubgraph,
      fieldDef,
    }),
  }
}

function planSubfields({
  schema,
  fragments,
  fieldNodes,
  fieldSubgraph,
  fieldDef
}: {
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  fieldNodes: FieldNode[],
  fieldSubgraph: string,
  fieldDef: GraphQLField<any, any>,
}) {
  let fieldsForTypes: Record<string, Record<string, FieldPlan>>;
  const returnType = getNamedType(fieldDef.type);
  if (isAbstractType(returnType)) {
    fieldsForTypes = Object.create(null);
    for (const possibleType of schema.getPossibleTypes(returnType)) {
      const { fields } = collectSubFields(
        schema,
        fragments,
        {},
        possibleType,
        fieldNodes,
      );
      fieldsForTypes[possibleType.name] = planFields({
        schema,
        fields,
        parentType: possibleType,
        fragments,
      })
    }
  } else if (isObjectType(returnType)) {
    fieldsForTypes = Object.create(null);
    const { fields:subfieldNodes } = collectSubFields(
      schema,
      fragments,
      {},
      returnType,
      fieldNodes,
    );
    const fieldsForType: Record<string, FieldPlan> = Object.create(null);
    for (const [responseName, fieldNodes] of subfieldNodes) {
      fieldsForType[responseName] = planField({
        schema,
        parentType: returnType,
        fieldNodes,
        parentSubgraph: fieldSubgraph,
        fragments,
      });
    }
    fieldsForTypes[returnType.name] = fieldsForType;
  }
  return {
    fieldsForTypes,
    list: isListType(fieldDef.type),
  }
}

type FieldPlan = {
  fieldName: string;
  fieldArgs: FieldNode['arguments'];
  fieldsForTypes: Record<string, Record<string, FieldPlan>>;
  list: boolean;
} | {
  fieldArgs: FieldNode['arguments'];
  fieldResolverDirective: DirectiveAnnotation<ResolverDirectiveArgs>;
  variableDirectivesForFieldResolver: DirectiveAnnotation<VariableDirectiveArgs>[];
  fieldsForTypes?: Record<string, Record<string, FieldPlan>>;
  list: boolean;
} | {
  fieldName: string;
  fieldArgs: FieldNode['arguments'];
  typeResolverDirective: DirectiveAnnotation<ResolverDirectiveArgs>;
  variableDirectivesForTypeResolver: DirectiveAnnotation<VariableDirectiveArgs>[];
  fieldsForTypes?: Record<string, Record<string, FieldPlan>>;
  list: boolean;
};

type ExtendedFieldPlan = {
  fieldName: string;
  fieldArgs: FieldNode['arguments'];
  fieldsForTypes: Record<string, Record<string, FieldPlan>>;
  list: boolean;
} | {
  fieldArgs: FieldNode['arguments'];
  fieldResolverDirective: DirectiveAnnotation<ResolverDirectiveArgs>;
  variableDirectivesForFieldResolver: DirectiveAnnotation<VariableDirectiveArgs>[];
  fieldsForTypes?: Record<string, Record<string, FieldPlan>>;
  list: boolean;
} | {
  fieldName: string;
  fieldArgs: FieldNode['arguments'];
  typeResolverDirective: DirectiveAnnotation<ResolverDirectiveArgs>;
  variableDirectivesForTypeResolver: DirectiveAnnotation<VariableDirectiveArgs>[];
  fieldsForTypes?: Record<string, Record<string, FieldPlan>>;
  list: boolean;
};

function findResolver({
  resolverDirectives,
  variableDirectives,
  fieldArgs: fieldArgs,
}: {
  resolverDirectives: DirectiveAnnotation<ResolverDirectiveArgs>[];
  variableDirectives: DirectiveAnnotation<VariableDirectiveArgs>[];
  fieldArgs: FieldNode['arguments'];
}) {
  for (const resolverDirective of resolverDirectives) {
    const resolverOperationStr = resolverDirective.args?.operation;
    const resolverOperation = parse(resolverOperationStr);
    const resolverOpAST = getOperationAST(resolverOperation);
    if (!resolverOpAST) {
      throw new Error(
        `Invalid operation in the resolver directive ${inspect(resolverDirective)}`,
      );
    }
    let okForSubgraph = true;
    const variableDirectivesForResolver: DirectiveAnnotation<VariableDirectiveArgs>[] = [];
    if (resolverOpAST.variableDefinitions) {
      for (const resolverOperationVariableDef of resolverOpAST.variableDefinitions) {
        const variableType = resolverOperationVariableDef.type;
        const matchingVariables = variableDirectives.filter(
          directive => directive.args?.name === resolverOperationVariableDef.variable.name.value,
        )
        const matchingArguments = fieldArgs.filter(
          arg => resolverOperationVariableDef.variable.name.value === `_arg_${arg.name.value}`,
        )
        if (resolverDirective.args?.kind === 'BATCH') {
          if (
            !matchingVariables.length &&
            !matchingArguments.length &&
            variableType.kind === Kind.LIST_TYPE &&
            variableType.type.kind === Kind.NON_NULL_TYPE
          ) {
            okForSubgraph = false;
            break;
          }
        }
        if (!matchingVariables.length &&
          !matchingArguments.length && variableType.kind === Kind.NON_NULL_TYPE) {
          okForSubgraph = false;
          break;
        }
        variableDirectivesForResolver.push(
          ...matchingVariables,
        )
      }
    }
    if (okForSubgraph) {
      return {
        resolverDirective,
        variableDirectivesForResolver
      };
    }
  }
}

export function isListType(type: GraphQLOutputType) {
  if (isNonNullType(type)) {
    return type.ofType instanceof GraphQLList;
  }
  return type instanceof GraphQLList;
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
