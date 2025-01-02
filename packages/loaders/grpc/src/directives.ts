import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';
import { ObjMapScalar } from '@graphql-mesh/transport-common';

export const grpcMethodDirective = new GraphQLDirective({
  name: 'grpcMethod',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
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
    subgraph: {
      type: GraphQLString,
    },
    rootJsonName: {
      type: GraphQLString,
    },
    objPath: {
      type: GraphQLString,
    },
  },
});

export const EnumDirective = new GraphQLDirective({
  name: 'enum',
  locations: [DirectiveLocation.ENUM_VALUE],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    value: {
      type: GraphQLString,
    },
  },
});

export const transportDirective = new GraphQLDirective({
  name: 'transport',
  args: {
    subgraph: {
      type: GraphQLString,
    },
    kind: {
      type: GraphQLString,
    },
    location: {
      type: GraphQLString,
    },
    options: {
      type: new GraphQLScalarType({ name: 'TransportOptions' }),
    },
  },
  isRepeatable: true,
  locations: [DirectiveLocation.SCHEMA],
});
