import { DirectiveLocation, GraphQLBoolean, GraphQLDirective, GraphQLString } from 'graphql';

export const protobufRpcDirective = new GraphQLDirective({
  name: 'protobuf__rpc',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
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
    args: {
      type: GraphQLString,
    },
    selection: {
      type: GraphQLString,
    },
    stream: {
      type: GraphQLBoolean,
    },
    entity: {
      type: GraphQLBoolean,
    },
  },
});

export { TransportDirective as transportDirective } from '@graphql-mesh/utils';
