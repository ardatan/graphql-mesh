import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputType,
  GraphQLOutputType,
} from 'graphql';

import { BigIntResolver as GraphQLBigInt } from 'graphql-scalars';

export interface GrpcGraphqlSchemaConfiguration {
  endpoint: string;
  protoFilePath: string;
  serviceName: string;
  packageName: string;
}

export interface InputTypeMapping {
  [key: string]: GraphQLInputType;
}
export interface OutputTypeMapping {
  [key: string]: GraphQLOutputType;
}

// https://developers.google.com/protocol-buffers/docs/proto3#scalar
// https://www.apollographql.com/docs/apollo-server/schemas/types.html
const GRPC_GQL_TYPE_MAPPING = {
  int32: GraphQLInt,
  int64: GraphQLBigInt, // TODO: https://github.com/graphql/graphql-js/issues/292
  float: GraphQLFloat,
  double: GraphQLFloat,
  string: GraphQLString,
  bool: GraphQLBoolean,
};

export const inputTypeDefinitionCache: InputTypeMapping = {
  ...GRPC_GQL_TYPE_MAPPING,
};

export const outputTypeDefinitionCache: OutputTypeMapping = {
  ...GRPC_GQL_TYPE_MAPPING,
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
