import { MeshHandlerLibrary, ResolverData, YamlConfig } from '@graphql-mesh/types';
import { fetchache, Request } from 'fetchache';
import { UrlLoader } from '@graphql-tools/url-loader';
import { GraphQLSchema, buildClientSchema, introspectionFromSchema } from 'graphql';
import { introspectSchema } from '@graphql-tools/wrap';
import { getInterpolatedHeadersFactory, ResolverDataBasedFactory } from '@graphql-mesh/utils';
import { ExecutionParams } from '@graphql-tools/delegate';

const handler: MeshHandlerLibrary<YamlConfig.GraphQLHandler> = {
  async getMeshSource({ name, config, cache }) {
    const urlLoader = new UrlLoader();
    const customFetch: WindowOrWorkerGlobalScope['fetch'] = (...args) =>
      fetchache(args[0] instanceof Request ? args[0] : new Request(...args), cache);
    const getExecutorAndSubscriberForParams = (
      params: ExecutionParams,
      headersFactory: ResolverDataBasedFactory<Headers>
    ) => {
      const resolverData: ResolverData = {
        root: {},
        args: params.variables,
        context: params.context,
      };
      const headersObj = headersFactory(resolverData);
      const headers: HeadersInit = {};
      headersObj.forEach((val, key) => {
        headers[key] = val;
      });
      return urlLoader.getExecutorAndSubscriber(config.endpoint, {
        customFetch,
        ...config,
        headers,
      });
    };
    let schema: GraphQLSchema;
    const schemaHeadersFactory = getInterpolatedHeadersFactory(config.schemaHeaders);
    if (config.cacheIntrospection) {
      const cacheKey = name + '_introspection';
      const introspectionData: any = await cache.get(cacheKey);
      if (introspectionData) {
        schema = buildClientSchema(introspectionData);
      } else {
        schema = await introspectSchema(async params => {
          const { executor } = await getExecutorAndSubscriberForParams(params, schemaHeadersFactory);
          return executor(params);
        });
        await cache.set(cacheKey, introspectionFromSchema(schema) as any);
      }
    } else {
      schema = await introspectSchema(async params => {
        const { executor } = await getExecutorAndSubscriberForParams(params, schemaHeadersFactory);
        return executor(params);
      });
    }
    const operationHeadersFactory = getInterpolatedHeadersFactory(config.operationHeaders);
    return {
      schema,
      executor: async params => {
        const { executor } = await getExecutorAndSubscriberForParams(params, operationHeadersFactory);
        return executor(params);
      },
      subscriber: async params => {
        const { subscriber } = await getExecutorAndSubscriberForParams(params, operationHeadersFactory);
        return subscriber(params);
      },
    };
  },
};

export default handler;
