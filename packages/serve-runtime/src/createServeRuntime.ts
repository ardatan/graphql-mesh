import { createYoga, FetchAPI, YogaServerInstance, type Plugin } from 'graphql-yoga';
import { useSupergraph } from '@graphql-mesh/fusion-runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Logger, MeshFetch, OnFetchHook } from '@graphql-mesh/types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DefaultLogger, getHeadersObj, wrapFetchWithHooks } from '@graphql-mesh/utils';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { useExecutor } from '@graphql-tools/executor-yoga';
import { handleSupergraphConfig } from './handleSupergraphConfig.js';
import {
  MeshHTTPPlugin,
  MeshHTTPHandlerConfiguration as MeshServeRuntimeConfiguration,
} from './types';
import { useFederationSupergraph } from './useFederationSupergraph.js';

export function createServeRuntime<TServerContext, TUserContext = {}>(
  config: MeshServeRuntimeConfiguration<TServerContext, TUserContext>,
): YogaServerInstance<TServerContext, TUserContext> & { invalidateSupergraph(): void } {
  let fetchAPI: FetchAPI = config.fetchAPI;
  // eslint-disable-next-line prefer-const
  let logger: Logger;
  let wrappedFetchFn: MeshFetch;

  const serveContext = {
    get fetch() {
      return wrappedFetchFn;
    },
    get logger() {
      return logger;
    },
    cwd: globalThis.process?.cwd(),
    cache: 'cache' in config ? config.cache : undefined,
    pubsub: 'pubsub' in config ? config.pubsub : undefined,
  };

  let supergraphYogaPlugin: Plugin<TServerContext> & { invalidateSupergraph: () => void };

  if ('http' in config) {
    const executor = buildHTTPExecutor({
      fetch: fetchAPI?.fetch,
      ...config.http,
    });
    supergraphYogaPlugin = useExecutor(executor);
  } else {
    const supergraphSpec = 'spec' in config ? config.spec : 'fusion';

    const supergraphConfig = 'supergraph' in config ? config.supergraph : './supergraph.graphql';
    if (supergraphSpec === 'fusion') {
      supergraphYogaPlugin = useSupergraph<TServerContext, TUserContext>({
        getSupergraph() {
          return handleSupergraphConfig(supergraphConfig, serveContext);
        },
        transports: config.transports,
        polling: config.polling,
        additionalResolvers: config.additionalResolvers,
        transportBaseContext: serveContext,
      });
    } else if (supergraphSpec === 'federation') {
      supergraphYogaPlugin = useFederationSupergraph({
        serveContext,
        supergraphConfig,
        transports: config.transports,
      });
    }
  }

  const defaultFetchPlugin: MeshHTTPPlugin<TServerContext, {}> = {
    onFetch({ setFetchFn }) {
      setFetchFn(fetchAPI.fetch);
    },
    onYogaInit({ yoga }) {
      const onFetchHooks: OnFetchHook<TServerContext>[] = [];

      for (const plugin of yoga.getEnveloped._plugins as MeshHTTPPlugin<TServerContext, {}>[]) {
        if (plugin.onFetch) {
          onFetchHooks.push(plugin.onFetch);
        }
      }

      wrappedFetchFn = wrapFetchWithHooks(onFetchHooks);
    },
  };

  const yoga = createYoga<TServerContext>({
    fetchAPI: config.fetchAPI,
    logging: config.logging == null ? new DefaultLogger() : config.logging,
    plugins: [defaultFetchPlugin, supergraphYogaPlugin, ...(config.plugins?.(serveContext) || [])],
    context({ request, req, connectionParams }: any) {
      // Maybe Node-like environment
      if (req?.headers) {
        return {
          headers: getHeadersObj(req.headers),
          connectionParams,
        };
      }
      // Fetch environment
      if (request?.headers) {
        return {
          headers: getHeadersObj(request.headers),
          connectionParams,
        };
      }
      return undefined;
    },
    cors: config.cors,
    graphiql: config.graphiql,
    batching: config.batching,
    graphqlEndpoint: config.graphqlEndpoint,
    maskedErrors: config.maskedErrors,
  });

  fetchAPI ||= yoga.fetchAPI;
  logger = yoga.logger as Logger;

  Object.defineProperty(yoga, 'invalidateSupergraph', {
    value: supergraphYogaPlugin.invalidateSupergraph,
    configurable: true,
  });

  return yoga as any;
}
