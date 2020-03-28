import grpcCaller from 'grpc-caller';
import {
  GraphQLSchema,
  GraphQLInputObjectType,
  GraphQLObjectType,
} from 'graphql';

import { GrpcGraphqlSchemaConfiguration } from './types';
import { getGraphqlTypeFromProtoDefinition } from './type_converter';
import {
  getGraphqlQueriesFromProtoService,
  getGraphQlSubscriptionsFromProtoService,
  getGraphqlMutationsFromProtoService,
} from './service_converter';
import { getPackageProtoDefinition } from './protobuf';
import { INamespace, AnyNestedObject, IType } from 'protobufjs';

export {
  getGraphqlQueriesFromProtoService,
  getGraphqlMutationsFromProtoService,
  getGraphQlSubscriptionsFromProtoService,
} from './service_converter';

export {
  getGraphqlTypeFromProtoDefinition,
} from './type_converter';
export {
  GRPC_GQL_TYPE_MAPPING,
  GrpcGraphqlSchemaConfiguration,
  typeDefinitionCache,
} from './types';

type GraphqlInputTypes = GraphQLInputObjectType | GraphQLObjectType;

export async function getGraphqlSchemaFromGrpc({
  endpoint,
  protoFilePath,
  serviceName,
  packageName,
}: GrpcGraphqlSchemaConfiguration): Promise<GraphQLSchema> {
  const client = grpcCaller(
    endpoint,
    protoFilePath,
    serviceName,
    null,
    {
      'grpc.max_send_message_length': -1,
      'grpc.max_receive_message_length': -1,
    },
  );

  const { nested = {} }: INamespace =
    await getPackageProtoDefinition(protoFilePath, packageName);

  const types: GraphqlInputTypes[] = Object.keys(nested)
    .filter((key: string) => 'fields' in nested[key])
    .reduce(
      (acc: GraphqlInputTypes[], key: string) => {
        const definition: AnyNestedObject = nested[key];

        // skip empty
        if (key.startsWith('Empty')) {
          return acc;
        }

        if ((<IType>definition).fields) {
          return acc.concat([
            getGraphqlTypeFromProtoDefinition({
              definition: (<IType>definition),
              typeName: key,
            }),
          ]);
        }

        return acc;
      },
      [],
    );

  const query = Object.keys(nested)
    .filter((key: string) => 'methods' in nested[key] && key === serviceName)
    .reduce(
      (__: any, key: string): GraphQLObjectType | null => {
        const definition = nested[key];

        return getGraphqlQueriesFromProtoService({
          client,
          definition,
          serviceName: key,
        });
      },
      null,
    );

  const mutation = Object.keys(nested)
    .filter((key: string) => 'methods' in nested[key] && key === serviceName)
    .reduce(
      (__: any, key: string): GraphQLObjectType | null => {
        const definition = nested[key];

        return getGraphqlMutationsFromProtoService({
          client,
          definition,
          serviceName: key,
        });
      },
      null,
    );

  const subscription = Object.keys(nested)
    .filter(key => 'methods' in nested[key] && key === serviceName)
    .reduce(
      (__: any, key: string): GraphQLObjectType | null => {
        const definition = nested[key];

        return getGraphQlSubscriptionsFromProtoService({
          client,
          definition,
          serviceName: key,
        });
      },
      null,
    );

  return new GraphQLSchema({
    types,
    query,
    mutation,
    subscription,
  });
}
