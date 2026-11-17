import { DirectiveLocation, GraphQLBoolean, GraphQLDirective, GraphQLString } from 'graphql';

export const protobufRpcDirective = new GraphQLDirective({
  name: 'protobuf__rpc',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: {
      type: GraphQLString,
    },
    service: {
      type: GraphQLString,
    },
    method: {
      type: GraphQLString,
    },
    body: {
      type: GraphQLString,
    },
    selection: {
      type: GraphQLString,
    },
    stream: {
      type: GraphQLBoolean,
    },
  },
});

/** @deprecated removed — use @protobuf__rpc */
export const grpcMethodDirective = protobufRpcDirective;

/** Connectivity removed from protobuf author surface */
export const grpcConnectivityStateDirective = new GraphQLDirective({
  name: 'grpcConnectivityState',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    subgraph: { type: GraphQLString },
  },
});

/** @deprecated enum stamps removed — numbers live in mapping dialect */
export const EnumDirective = new GraphQLDirective({
  name: 'enum',
  locations: [DirectiveLocation.ENUM_VALUE],
  args: {
    subgraph: { type: GraphQLString },
    value: { type: GraphQLString },
  },
});

export { TransportDirective as transportDirective } from '@graphql-mesh/utils';
