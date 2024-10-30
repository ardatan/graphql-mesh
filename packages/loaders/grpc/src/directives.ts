import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLInputObjectType,
  GraphQLInt,
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

export const GrpcCredentialsSsl = new GraphQLInputObjectType({
  name: 'GrpcCredentialsSsl',
  fields: {
    rootCA: {
      type: GraphQLString,
    },
    certChain: {
      type: GraphQLString,
    },
    privateKey: {
      type: GraphQLString,
    },
  },
});

export const TransportOptions = new GraphQLInputObjectType({
  name: 'TransportOptions',
  fields: {
    requestTimeout: {
      type: GraphQLInt,
    },
    credentialsSsl: {
      type: GrpcCredentialsSsl,
    },
    useHTTPS: {
      type: GraphQLBoolean,
    },
    metaData: {
      type: ObjMapScalar,
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
      type: TransportOptions,
    },
  },
  isRepeatable: true,
  locations: [DirectiveLocation.SCHEMA],
});
