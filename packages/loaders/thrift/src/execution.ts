import { type GraphQLSchema } from 'graphql';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { createGraphQLThriftClient } from './client.js';
import { GraphQLThriftAnnotations } from './types.js';

export function getExecutableThriftSchema(subgraph: GraphQLSchema): GraphQLSchema {
  const transportDirectives = getDirective(subgraph, subgraph, 'transport');
  if (!transportDirectives?.length) {
    throw new Error('No transport directive found on schema');
  }
  const graphqlAnnotations = transportDirectives[0] as GraphQLThriftAnnotations;
  const client = createGraphQLThriftClient(graphqlAnnotations);
  const headersFactory = getInterpolatedHeadersFactory(graphqlAnnotations.headers);

  return mapSchema(subgraph, {
    [MapperKind.ROOT_FIELD]: (fieldConfig, fnName) => {
      const fieldTypeMapDirectives = getDirective(subgraph, fieldConfig, 'fieldTypeMap');
      fieldTypeMapDirectives?.forEach(fieldTypeMap => {
        fieldConfig.resolve = function thriftRootFieldResolver(root, args, context, info) {
          return client.doRequest(fnName, args, fieldTypeMap, {
            headers: headersFactory({ root, args, context, info, env: globalThis.process?.env }),
          });
        };
      });
      return fieldConfig;
    },
  });
}
