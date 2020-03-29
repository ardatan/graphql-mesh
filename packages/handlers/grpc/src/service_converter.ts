import {
  GraphQLObjectType, GraphQLFieldConfigMap, Thunk, GraphQLFieldConfig, GraphQLOutputType, GraphQLFieldConfigArgumentMap, GraphQLInputType,
} from 'graphql';

import { withAsyncIteratorCancel } from './subscription';

import {
  typeDefinitionCache,
} from './types';
import { Readable } from 'stream';
import { asyncMap } from 'iter-tools';

const isEmpty = (obj: any) => [Object, Array].includes((obj || {}).constructor) && !Object.entries((obj || {})).length;

function getGraphqlMethodsFromProtoService({
  definition,
  serviceName,
  client,
  methodType,
}: {
  definition: any,
  serviceName: string;
  client: any;
  methodType: 'Query' | 'Mutation';
}) {
  const { methods } = definition;
  const fields: Thunk<GraphQLFieldConfigMap<any, any>> = () => Object.keys(methods).reduce(
    (result: GraphQLFieldConfigMap<any, any>, methodName): GraphQLFieldConfigMap<any, any> => {
      const args: GraphQLFieldConfigArgumentMap = {};
      const {
        requestType: requestArgName,
        responseType,
        responseStream,
        comment,
      } = methods[methodName];

      if (responseStream) {
        // responseStream should be in subscriptions
        return result;
      }

      // filter for mutations
      if (methodType === 'Mutation' && !methodName.startsWith('Set')) {
        return result;
      }

      // filter out ping for mutation
      if (methodType === 'Mutation' && methodName === 'ping') {
        return result;
      }

      if (!requestArgName.startsWith('Empty')) {
        args[requestArgName] = {
          type: typeDefinitionCache[requestArgName] as GraphQLInputType,
        };
      }

      const queryField: GraphQLFieldConfig<any, any> = {
        args,
        type: typeDefinitionCache[responseType] as GraphQLOutputType,
        description: comment,
        resolve: async (__, arg) => {
          const response = await client[methodName](
            arg[requestArgName] || {},
            {},
            {
              deadline:
                  Date.now() + (Number(process.env.REQUEST_TIMEOUT) || 200000),
            },
          );
          // FIXME: there is a bug in the graphQL type conversion
          return response;
          // return convertGrpcTypeToGraphqlType(
          //   response,
          //   typeDefinitionCache[responseType],
          // );
        },
      };

      // eslint-disable-next-line no-param-reassign
      result[`${serviceName}${methodName}`] = <GraphQLFieldConfig<any, any>>queryField;

      return result;
    },
    (methodType === 'Mutation') ? {} : {
      // adding a default ping
      ping: {
        type: <GraphQLOutputType>typeDefinitionCache.ServerStatus,
        description: 'query for getting server status',
        resolve: () => ({ status: 'online' }),
      },
    },
  );

  if (isEmpty(fields())) {
    return null;
  }

  return new GraphQLObjectType({
    fields,
    name: methodType,
  });
}

export function getGraphqlQueriesFromProtoService({
  definition,
  serviceName,
  client,
}: {
  definition: any,
  serviceName: string;
  client: any;
}) {
  return getGraphqlMethodsFromProtoService({
    definition,
    serviceName,
    client,
    methodType: 'Query',
  });
}

export function getGraphqlMutationsFromProtoService({
  definition,
  serviceName,
  client,
}: {
  definition: any,
  serviceName: string;
  client: any;
}) {
  return getGraphqlMethodsFromProtoService({
    definition,
    serviceName,
    client,
    methodType: 'Mutation',
  });
}

export function getGraphQlSubscriptionsFromProtoService({
  definition,
  serviceName,
  client,
}: {
  definition: any,
  serviceName: string;
  client: any;
}) {
  const { methods } = definition;
  const fields = () => Object.keys(methods).reduce<any>(
    (result, methodName) => {
      const args: GraphQLFieldConfigArgumentMap = {};
      const {
        requestType: requestArgName,
        responseType,
        responseStream,
        comment,
      } = methods[methodName];

      if (!responseStream) {
        // non-responseStream should be in queries / mutations
        return result;
      }

      if (!requestArgName.startsWith('Empty')) {
        args[requestArgName] = {
          type: typeDefinitionCache[requestArgName] as GraphQLInputType,
        };
      }

      const subscribeField: GraphQLFieldConfig<any, any> = {
        args,
        type: typeDefinitionCache[responseType] as GraphQLOutputType,
        description: comment,
        subscribe: async (__, arg) => {
          const response: Readable & { cancel: () => void; } = await client[methodName](
            arg[requestArgName] || {},
            {},
          );

          response.on('error', (error: Error & { code: number }) => {
            if (error.code === 1) {
              // cancelled
              response.removeAllListeners('error');
              response.removeAllListeners();
            }
          });

          response.on('end', () => {
            response.removeAllListeners();
          });

          const asyncIterator = asyncMap(data => ({ [`${serviceName}${methodName}`]: data }), response);

          return withAsyncIteratorCancel(asyncIterator, () => {
            response.cancel();
          });
        },
      };

      // eslint-disable-next-line no-param-reassign
      result[`${serviceName}${methodName}`] = subscribeField;

      return result;
    },
    {},
  );

  if (isEmpty(fields())) {
    return null;
  }

  return new GraphQLObjectType({
    fields,
    name: 'Subscription',
  });
}
