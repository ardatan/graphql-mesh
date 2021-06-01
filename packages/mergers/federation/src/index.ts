import { MergerFn, RawSourceOutput } from '@graphql-mesh/types';
import { GraphQLSchema, print, extendSchema, DocumentNode, parse } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { ApolloGateway } from '@apollo/gateway';
import { addResolversToSchema } from '@graphql-tools/schema';
import { meshDefaultCreateProxyingResolver, hashObject, jitExecutorFactory } from '@graphql-mesh/utils';
import { getDocumentNodeFromSchema } from '@graphql-tools/utils';

const mergeUsingFederation: MergerFn = async function ({
  rawSources,
  cache,
  pubsub,
  typeDefs,
  resolvers,
  transforms,
}): Promise<GraphQLSchema> {
  const rawSourceMap = new Map<string, RawSourceOutput>();
  const localServiceList: { name: string; typeDefs: DocumentNode }[] = [];
  const sourceMap = new Map<RawSourceOutput, GraphQLSchema>();
  await Promise.all(
    rawSources.map(async rawSource => {
      const transformedSchema = wrapSchema({
        createProxyingResolver: meshDefaultCreateProxyingResolver,
        ...rawSource,
      });
      rawSourceMap.set(rawSource.name, rawSource);
      sourceMap.set(rawSource, transformedSchema);
      localServiceList.push({
        name: rawSource.name,
        typeDefs: transformedSchema.extensions?.apolloServiceSdl
          ? parse(transformedSchema.extensions?.apolloServiceSdl)
          : getDocumentNodeFromSchema(transformedSchema),
      });
    })
  );
  const gateway = new ApolloGateway({
    localServiceList,
    buildService({ name }) {
      const rawSource = rawSourceMap.get(name);
      const transformedSchema = sourceMap.get(rawSource);
      const jitExecute = jitExecutorFactory(transformedSchema, name);
      return {
        process: ({ request, context }) =>
          jitExecute(
            {
              document: parse(request.query),
              variables: request.variables,
              context: context.graphqlContext || context,
            },
            request.operationName,
            null
          ) as any,
      };
    },
  });
  const { schema, executor: gatewayExecutor } = await gateway.load();
  const schemaHash: any = hashObject({ schema });
  let remoteSchema: GraphQLSchema = schema;
  remoteSchema = wrapSchema({
    createProxyingResolver: meshDefaultCreateProxyingResolver,
    schema: remoteSchema,
    executor: ({ document, info, variables, context }): any => {
      const documentStr = print(document);
      const { operation } = info;
      // const operationName = operation.name?.value;
      return gatewayExecutor({
        document,
        request: {
          query: documentStr,
          operationName: undefined,
          variables,
        },
        operationName: undefined,
        cache,
        context,
        queryHash: documentStr,
        logger: console,
        metrics: {},
        source: documentStr,
        operation,
        schema,
        schemaHash,
      });
    },
  });
  pubsub.subscribe('destroy', () => gateway.stop());
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
  if (transforms?.length) {
    remoteSchema = wrapSchema({
      schema: remoteSchema,
      transforms,
      executor: jitExecutorFactory(remoteSchema, 'wrapped') as any,
      createProxyingResolver: meshDefaultCreateProxyingResolver,
    });
  }
  remoteSchema.extensions = remoteSchema.extensions || {};
  Object.defineProperty(remoteSchema.extensions, 'sourceMap', {
    get: () => sourceMap,
  });
  return remoteSchema;
};

export default mergeUsingFederation;
