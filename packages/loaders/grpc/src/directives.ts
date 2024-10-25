import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
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

export const grpcRootJsonDirective = new GraphQLDirective({
  name: 'grpcRootJson',
  locations: [DirectiveLocation.OBJECT],
  args: {
    subgraph: {
      type: GraphQLString,
    },
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
