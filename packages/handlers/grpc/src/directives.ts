import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';

export const grpcMethodDirective = new GraphQLDirective({
  name: 'grpcMethod',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    rootJsonName: {
      type: GraphQLString,
    },
    objPath: {
      type: GraphQLString,
    },
    methodName: {
      type: GraphQLString,
    },
    responseStream: {
      type: GraphQLBoolean,
    },
  },
});

export const grpcConnectivityStateDirective = new GraphQLDirective({
  name: 'grpcConnectivityState',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    rootJsonName: {
      type: GraphQLString,
    },
    objPath: {
      type: GraphQLString,
    },
  },
});

export const ObjMapScalar = new GraphQLScalarType({
  name: 'ObjMap',
  serialize: value => JSON.stringify(value),
  parseValue: value => JSON.parse(value.toString()),
  parseLiteral: ast => {
    if (ast.kind === 'StringValue') {
      return JSON.parse(ast.value);
    }
    return null;
  },
});

export const grpcRootJsonDirective = new GraphQLDirective({
  name: 'grpcRootJson',
  locations: [DirectiveLocation.OBJECT],
  args: {
    name: {
      type: GraphQLString,
    },
    rootJson: {
      type: ObjMapScalar,
    },
    loadOptions: {
      type: ObjMapScalar,
    },
  },
  isRepeatable: true,
});
