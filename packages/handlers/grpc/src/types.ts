import {
  GraphQLType,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';

import {
  BigIntResolver as GraphQLBigInt,
} from 'graphql-scalars';

export interface GrpcGraphqlSchemaConfiguration {
  endpoint: string;
  protoFilePath: string;
  serviceName: string;
  packageName: string;
}

export interface TypeMapping {
  [key: string]: GraphQLType;
}

// https://developers.google.com/protocol-buffers/docs/proto3#scalar
// https://www.apollographql.com/docs/apollo-server/schemas/types.html
export const GRPC_GQL_TYPE_MAPPING: TypeMapping = {
  int32: GraphQLInt,
  int64: GraphQLBigInt, // TODO: https://github.com/graphql/graphql-js/issues/292
  float: GraphQLFloat,
  double: GraphQLFloat,
  string: GraphQLString,
  bool: GraphQLBoolean,
};

export const typeDefinitionCache: TypeMapping = {
  ServerStatus: new GraphQLObjectType({
    name: 'ServerStatus',
    description: 'status of the server',
    fields: () => ({
      status: {
        type: GraphQLString,
        descripton: 'status string',
      },
    }),
  }),
};
