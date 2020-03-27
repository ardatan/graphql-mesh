import {
  GraphQLSchema,
  GraphQLObjectType,
  isObjectType,
  getNamedType,
  isUnionType,
  DocumentNode,
  OperationDefinitionNode,
  VariableDefinitionNode,
  isNonNullType,
  SelectionNode,
  InlineFragmentNode,
  GraphQLNamedType,
  SelectionSetNode,
  isScalarType,
  TypeNode,
  isListType,
  ArgumentNode,
  GraphQLField,
  GraphQLArgument,
  GraphQLInputType,
  GraphQLList,
  ListTypeNode,
  GraphQLNonNull,
  NonNullTypeNode,
  OperationTypeNode,
  isInterfaceType,
  Kind,
} from 'graphql';
import { camelCase } from 'change-case';

let operationVariables: VariableDefinitionNode[] = [];
let fieldTypeMap = new Map();

function addOperationVariable(variable: VariableDefinitionNode) {
  operationVariables.push(variable);
}

function resetOperationVariables() {
  operationVariables = [];
}

function buildOperationName(name: string) {
  return camelCase(name);
}

export type Skip = string[];
export type Force = string[];
export type Ignore = string[];

export function buildOperation({
  schema,
  kind,
  field,
  models,
  ignore,
  depthLimit,
  argNames,
}: {
  schema: GraphQLSchema;
  kind: OperationTypeNode;
  field: string;
  models?: string[];
  ignore?: Ignore;
  depthLimit?: number;
  argNames?: string[];
}) {
  resetOperationVariables();

  const operationNode = buildOperationNode({
    schema,
    fieldName: field,
    kind,
    models: models || [],
    ignore: ignore || [],
    depthLimit: depthLimit || 1,
    argNames,
  });

  // attach variables
  (operationNode as any).variableDefinitions = [
    ...operationVariables,
  ];

  resetOperationVariables();

  return operationNode;
}

function buildOperationNode({
  schema,
  fieldName,
  kind,
  models,
  ignore,
  depthLimit,
  argNames,
}: {
  schema: GraphQLSchema;
  fieldName: string;
  kind: OperationTypeNode;
  models: string[];
  ignore: Ignore;
  depthLimit: number;
  argNames?: string[];
}): OperationDefinitionNode {
  const typeMap: Record<OperationTypeNode, GraphQLObjectType> = {
    query: schema.getQueryType()!,
    mutation: schema.getMutationType()!,
    subscription: schema.getSubscriptionType()!,
  };
  const type = typeMap[kind];
  const field = type.getFields()[fieldName];
  const operationName = buildOperationName(`${fieldName}_${kind}`);

  if (field.args) {
    field.args.forEach(arg => {
      const argName = arg.name;
      if (!argNames || argNames.includes(argName)) {
        addOperationVariable(resolveVariable(arg, argName));
      }
    });
  }

  return {
    kind: Kind.OPERATION_DEFINITION,
    operation: kind,
    name: {
      kind: 'Name',
      value: operationName,
    },
    variableDefinitions: [],
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [
        resolveField({
          type,
          field,
          models,
          firstCall: true,
          path: [],
          ancestors: [],
          ignore,
          depthLimit,
          schema,
          depth: 0,
          argNames,
        }),
      ],
    },
  };
}

function resolveSelectionSet({
  parent,
  type,
  models,
  firstCall,
  path,
  ancestors,
  ignore,
  depthLimit,
  schema,
  depth,
  argNames,
}: {
  parent: GraphQLNamedType;
  type: GraphQLNamedType;
  models: string[];
  path: string[];
  ancestors: GraphQLNamedType[];
  firstCall?: boolean;
  ignore: Ignore;
  depthLimit: number;
  schema: GraphQLSchema;
  depth: number;
  argNames?: string[];
}): SelectionSetNode | undefined {
  if (depth > depthLimit) {
    return undefined;
  }
  if (isUnionType(type)) {
    const types = type.getTypes();

    return {
      kind: Kind.SELECTION_SET,
      selections: types
        .filter(
          t =>
            !hasCircularRef([...ancestors, t], {
              depth: depthLimit,
            })
        )
        .map<InlineFragmentNode>(t => {
          return {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: t.name,
              },
            },
            selectionSet: resolveSelectionSet({
              parent: type,
              type: t,
              models,
              path,
              ancestors: [...ancestors, t],
              ignore,
              depthLimit,
              schema,
              depth,
              argNames,
            }) as SelectionSetNode,
          };
        }).filter(f => {
          if (f) {
            if ('selectionSet' in f) {
              return f.selectionSet?.selections?.length;
            } else {
              return true;
            }
          }
          return false;
        }),
    };
  }

  if (isInterfaceType(type)) {
    const types = Object.values(schema.getTypeMap()).filter(
      t => isObjectType(t) && t.getInterfaces().includes(type)
    ) as GraphQLObjectType[];

    return {
      kind: Kind.SELECTION_SET,
      selections: types
        .filter(
          t =>
            !hasCircularRef([...ancestors, t], {
              depth: depthLimit,
            })
        )
        .map<InlineFragmentNode>(t => {
          return {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: t.name,
              },
            },
            selectionSet: resolveSelectionSet({
              parent: type,
              type: t,
              models,
              path,
              ancestors: [...ancestors, t],
              ignore,
              depthLimit,
              schema,
              depth,
              argNames,
            }) as SelectionSetNode,
          };
        }),
    };
  }

  if (isObjectType(type)) {
    const isIgnored =
      ignore.includes(type.name) ||
      ignore.includes(`${parent.name}.${path[path.length - 1]}`);
    const isModel = models.includes(type.name);

    if (!firstCall && isModel && !isIgnored) {
      return {
        kind: Kind.SELECTION_SET,
        selections: [
          {
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: 'id',
            },
          },
        ],
      };
    }

    const fields = type.getFields();

    return {
      kind: Kind.SELECTION_SET,
      selections: Object.keys(fields)
        .filter(fieldName => {
          return !hasCircularRef(
            [...ancestors, getNamedType(fields[fieldName].type)],
            {
              depth: depthLimit,
            }
          );
        })
        .map(fieldName => {
          return resolveField({
            type: type,
            field: fields[fieldName],
            models,
            path: [...path, fieldName],
            ancestors: [...ancestors, getNamedType(fields[fieldName].type)],
            ignore,
            depthLimit,
            schema,
            depth,
            argNames,
          });
        }).filter(f => {
          if (f) {
            if ('selectionSet' in f) {
              return f.selectionSet?.selections?.length;
            } else {
              return true;
            }
          }
          return false;
        }),
    };
  }
}

function resolveVariable(
  arg: GraphQLArgument,
  name?: string
): VariableDefinitionNode {
  function resolveVariableType(type: GraphQLList<any>): ListTypeNode;
  function resolveVariableType(type: GraphQLNonNull<any>): NonNullTypeNode;
  function resolveVariableType(type: GraphQLInputType): TypeNode;
  function resolveVariableType(type: GraphQLInputType): TypeNode {
    if (isListType(type)) {
      return {
        kind: Kind.LIST_TYPE,
        type: resolveVariableType(type.ofType),
      };
    }

    if (isNonNullType(type)) {
      return {
        kind: Kind.NON_NULL_TYPE,
        type: resolveVariableType(type.ofType),
      };
    }

    return {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.name,
      },
    };
  }

  return {
    kind: Kind.VARIABLE_DEFINITION,
    variable: {
      kind: Kind.VARIABLE,
      name: {
        kind: Kind.NAME,
        value: name || arg.name,
      },
    },
    type: resolveVariableType(arg.type),
  };
}

function getArgumentName(name: string, path: string[]): string {
  return camelCase([...path, name].join('_'));
}

function resolveField({
  type,
  field,
  models,
  firstCall,
  path,
  ancestors,
  ignore,
  depthLimit,
  schema,
  depth,
  argNames,
}: {
  type: GraphQLObjectType;
  field: GraphQLField<any, any>;
  models: string[];
  path: string[];
  ancestors: GraphQLNamedType[];
  firstCall?: boolean;
  ignore: Ignore;
  depthLimit: number;
  schema: GraphQLSchema;
  depth: number;
  argNames?: string[];
}): SelectionNode {
  const namedType = getNamedType(field.type);
  let args: ArgumentNode[] = [];
  let removeField = false;

  if (field.args && field.args.length) {
    args = field.args.map<ArgumentNode>(arg => {
      const argumentName = getArgumentName(arg.name, path);
      if (argNames && !argNames.includes(argumentName)){
        if (isNonNullType(arg.type)) {
          removeField = true;
        }
        return null as any;
      }
      if (!firstCall) {
        addOperationVariable(
          resolveVariable(arg, argumentName)
        );
      }

      return {
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: arg.name,
        },
        value: {
          kind: Kind.VARIABLE,
          name: {
            kind: Kind.NAME,
            value: getArgumentName(arg.name, path),
          },
        },
      };
    }).filter(Boolean);
  }

  if (removeField) {
    return null as any;
  }

  let fieldName = field.name;
  if (fieldTypeMap.has(fieldName) && (fieldTypeMap.get(fieldName) !== field.type.toString())) {
    fieldName += (field.type as any).toString().replace('!', 'NonNull');
  }
  fieldTypeMap.set(fieldName, field.type.toString());

  if (!isScalarType(namedType)) {
    return {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: field.name,
      },
      ...((fieldName !== field.name) && { alias: { kind: Kind.NAME, value: fieldName }}),
      selectionSet: resolveSelectionSet({
        parent: type,
        type: namedType,
        models,
        firstCall,
        path: [...path, field.name],
        ancestors: [...ancestors, type],
        ignore,
        depthLimit,
        schema,
        depth: depth + 1,
        argNames,
      }),
      arguments: args,
    };
  }

  return {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: field.name,
    },
    ...((fieldName !== field.name) && { alias: { kind: Kind.NAME, value: fieldName }}),
    arguments: args,
  };
}

function hasCircularRef(
  types: GraphQLNamedType[],
  config: {
    depth: number;
  } = {
    depth: 1,
  }
): boolean {
  const type = types[types.length - 1];

  if (isScalarType(type)) {
    return false;
  }

  const size = types.filter(t => t.name === type.name).length;
  return size > config.depth;
}