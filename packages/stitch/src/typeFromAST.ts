import {
  DirectiveLocation,
  getDirectiveValues,
  GraphQLDeprecatedDirective,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  Kind,
  valueFromASTUntyped,
  type DirectiveDefinitionNode,
  type EnumTypeDefinitionNode,
  type EnumValueDefinitionNode,
  type FieldDefinitionNode,
  type GraphQLEnumValueConfigMap,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLNamedType,
  type InputObjectTypeDefinitionNode,
  type InputValueDefinitionNode,
  type InterfaceTypeDefinitionNode,
  type ObjectTypeDefinitionNode,
  type ScalarTypeDefinitionNode,
  type TypeDefinitionNode,
  type UnionTypeDefinitionNode,
} from 'graphql';
import {
  createNamedStub,
  createStub,
  type DirectiveLocationEnum,
  type Maybe,
} from '@graphql-tools/utils';

export default typeFromAST;

function typeFromAST(node: ObjectTypeDefinitionNode): GraphQLObjectType;
function typeFromAST(node: InterfaceTypeDefinitionNode): GraphQLInterfaceType;
function typeFromAST(node: EnumTypeDefinitionNode): GraphQLEnumType;
function typeFromAST(node: UnionTypeDefinitionNode): GraphQLUnionType;
function typeFromAST(node: ScalarTypeDefinitionNode): GraphQLScalarType;
function typeFromAST(node: InputObjectTypeDefinitionNode): GraphQLInputObjectType;
function typeFromAST(node: DirectiveDefinitionNode): GraphQLDirective;
function typeFromAST(node: TypeDefinitionNode): GraphQLNamedType;
function typeFromAST(
  node: TypeDefinitionNode | DirectiveDefinitionNode,
): GraphQLNamedType | GraphQLDirective | null {
  switch (node.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return makeObjectType(node);
    case Kind.INTERFACE_TYPE_DEFINITION:
      return makeInterfaceType(node);
    case Kind.ENUM_TYPE_DEFINITION:
      return makeEnumType(node);
    case Kind.UNION_TYPE_DEFINITION:
      return makeUnionType(node);
    case Kind.SCALAR_TYPE_DEFINITION:
      return makeScalarType(node);
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return makeInputObjectType(node);
    case Kind.DIRECTIVE_DEFINITION:
      return makeDirective(node);
    default:
      return null;
  }
}

function makeObjectType(node: ObjectTypeDefinitionNode): GraphQLObjectType {
  const config = {
    name: node.name.value,
    description: node.description?.value,
    interfaces: () =>
      node.interfaces?.map(iface => createNamedStub(iface.name.value, 'interface')) || [],
    fields: () => (node.fields != null ? makeFields(node.fields) : {}),
    astNode: node,
  };
  return new GraphQLObjectType(config);
}

function makeInterfaceType(node: InterfaceTypeDefinitionNode): GraphQLInterfaceType {
  const config = {
    name: node.name.value,
    description: node.description?.value,
    // graphql expects the thunk to always return a list
    interfaces: () =>
      node.interfaces?.map(iface => createNamedStub(iface.name.value, 'interface')) || [],
    fields: () => (node.fields != null ? makeFields(node.fields) : {}),
    astNode: node,
  };
  return new GraphQLInterfaceType(config as any);
}

function makeEnumType(node: EnumTypeDefinitionNode): GraphQLEnumType {
  const values =
    node.values?.reduce<GraphQLEnumValueConfigMap>(
      (prev, value) => ({
        ...prev,
        [value.name.value]: {
          description: value.description?.value,
          deprecationReason: getDeprecationReason(value),
          astNode: value,
        },
      }),
      {},
    ) ?? {};

  return new GraphQLEnumType({
    name: node.name.value,
    description: node.description?.value,
    values,
    astNode: node,
  });
}

function makeUnionType(node: UnionTypeDefinitionNode): GraphQLUnionType {
  return new GraphQLUnionType({
    name: node.name.value,
    description: node.description?.value,
    types: () => node.types?.map(type => createNamedStub(type.name.value, 'object')) ?? [],
    astNode: node,
  });
}

function makeScalarType(node: ScalarTypeDefinitionNode): GraphQLScalarType {
  return new GraphQLScalarType({
    name: node.name.value,
    description: node.description?.value,
    astNode: node,
  });
}

function makeInputObjectType(node: InputObjectTypeDefinitionNode): GraphQLInputObjectType {
  return new GraphQLInputObjectType({
    name: node.name.value,
    description: node.description?.value,
    fields: () => (node.fields ? makeValues(node.fields) : {}),
    astNode: node,
  });
}

function makeFields(
  nodes: ReadonlyArray<FieldDefinitionNode>,
): Record<string, GraphQLFieldConfig<any, any>> {
  return nodes.reduce(
    (prev, node) => ({
      ...prev,
      [node.name.value]: {
        type: createStub(node.type, 'output'),
        description: node.description?.value,
        args: makeValues(node.arguments ?? []),
        deprecationReason: getDeprecationReason(node),
        astNode: node,
      },
    }),
    {},
  );
}

function makeValues(nodes: ReadonlyArray<InputValueDefinitionNode>): GraphQLFieldConfigArgumentMap {
  return nodes.reduce(
    (prev, node) => ({
      ...prev,
      [node.name.value]: {
        type: createStub(node.type, 'input'),
        defaultValue:
          node.defaultValue !== undefined ? valueFromASTUntyped(node.defaultValue) : undefined,
        description: node.description?.value,
        astNode: node,
      },
    }),
    {},
  );
}

function isLocationValue(value: any): value is DirectiveLocationEnum {
  return value in DirectiveLocation;
}

function makeDirective(node: DirectiveDefinitionNode): GraphQLDirective {
  const locations: Array<DirectiveLocationEnum> = [];
  for (const location of node.locations) {
    const locationValue = location.value;
    if (isLocationValue(locationValue)) {
      locations.push(locationValue);
    }
  }
  return new GraphQLDirective({
    name: node.name.value,
    description: node.description != null ? node.description.value : null,
    locations: locations as any[],
    isRepeatable: node.repeatable,
    args: makeValues(node.arguments ?? []),
    astNode: node,
  });
}

function getDeprecationReason(node: EnumValueDefinitionNode | FieldDefinitionNode): Maybe<string> {
  const deprecated = getDirectiveValues(GraphQLDeprecatedDirective, node);
  return deprecated?.reason as string;
}
