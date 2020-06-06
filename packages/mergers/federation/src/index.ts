/* eslint-disable no-unused-expressions */
import { MergerFn, RawSourceOutput } from '@graphql-mesh/types';
import { GraphQLSchema, print, graphql, extendSchema } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { ApolloGateway } from '@apollo/gateway';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';

const mergeUsingFederation: MergerFn = async function ({
  rawSources,
  cache,
  hooks,
  typeDefs,
  resolvers,
  transforms,
}): Promise<GraphQLSchema> {
  const serviceMap = new Map<string, GraphQLSchema>();
  const serviceList: { name: string; url: string }[] = [];
  const sourceMap = new Map<RawSourceOutput, GraphQLSchema>();
  for (const rawSource of rawSources) {
    const transformedSchema = wrapSchema(rawSource);
    serviceMap.set(rawSource.name, transformedSchema);
    sourceMap.set(rawSource, transformedSchema);
    serviceList.push({
      name: rawSource.name,
      url: 'http://localhost/' + rawSource.name,
    });
  }
  const gateway = new ApolloGateway({
    serviceList,
    buildService({ name }) {
      return {
        process({ request, context }) {
          const schema = serviceMap.get(name);
          return graphql(
            schema,
            request.query,
            null,
            context.graphqlContext || context,
            request.variables,
            request.operationName
          );
        },
      };
    },
  });
  const { schema, executor: gatewayExecutor } = await gateway.load();
  let remoteSchema = wrapSchema({
    schema,
    executor: ({ document, info, variables, context }): any => {
      const documentStr = print(document);
      const { operation } = info;
      const operationName = operation.name?.value;
      return gatewayExecutor({
        document,
        request: {
          operationName,
          query: documentStr,
          variables,
        },
        operationName,
        cache,
        context,
        queryHash: documentStr + '_' + JSON.stringify(variables),
        logger: console,
        metrics: {},
        source: documentStr,
        operation,
        schema,
        schemaHash: printSchemaWithDirectives(schema) as any,
      });
    },
    transforms,
  });
  hooks.on('destroy', () => gateway.stop());
  typeDefs?.forEach(typeDef => {
    remoteSchema = extendSchema(remoteSchema, typeDef);
  });
  if (resolvers) {
    remoteSchema = addResolversToSchema({
      schema: remoteSchema,
      resolvers,
      updateResolversInPlace: true,
    });
  }
  remoteSchema.extensions = {
    sourceMap,
  };
  return remoteSchema;
};

export default mergeUsingFederation;
