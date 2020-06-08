import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { fetchache, Request } from 'fetchache';
import { UrlLoader } from '@graphql-tools/url-loader';
import { GraphQLSchema, buildClientSchema, introspectionFromSchema } from 'graphql';
import { introspectSchema } from '@graphql-tools/wrap';

const handler: MeshHandlerLibrary<YamlConfig.GraphQLHandler> = {
  async getMeshSource({ name, config, cache }) {
    const urlLoader = new UrlLoader();
    const customFetch: WindowOrWorkerGlobalScope['fetch'] = (...args) =>
      fetchache(args[0] instanceof Request ? args[0] : new Request(...args), cache);
    const { executor, subscriber } = await urlLoader.getExecutorAndSubscriber(config.endpoint, {
      customFetch,
      ...config,
    });
    let schema: GraphQLSchema;
    if (config.cacheIntrospection) {
      const cacheKey = name + '_introspection';
      const introspectionData: any = await cache.get(cacheKey);
      if (introspectionData) {
        schema = buildClientSchema(introspectionData);
      } else {
        schema = await introspectSchema(executor);
        await cache.set(cacheKey, introspectionFromSchema(schema) as any);
      }
    } else {
      schema = await introspectSchema(executor);
    }
    return { schema, executor, subscriber };
  },
};

export default handler;
