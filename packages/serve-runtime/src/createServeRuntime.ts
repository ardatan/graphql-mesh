import { createYoga, FetchAPI, YogaServerInstance, type Plugin } from 'graphql-yoga';
import { convertSupergraphToFusiongraph } from '@graphql-mesh/fusion-federation';
import { useFusiongraph } from '@graphql-mesh/fusion-runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Logger, MeshFetch, OnFetchHook } from '@graphql-mesh/types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DefaultLogger, getHeadersObj, wrapFetchWithHooks } from '@graphql-mesh/utils';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { useExecutor } from '@graphql-tools/executor-yoga';
import { isPromise } from '@graphql-tools/utils';
import { handleUnifiedGraphConfig } from './handleUnifiedGraphConfig.js';
import { MeshServeConfig, MeshServeContext, MeshServePlugin } from './types';

export function createServeRuntime(config: MeshServeConfig) {
  let fetchAPI: Partial<FetchAPI> = config.fetchAPI;
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

  let supergraphYogaPlugin: Plugin & { invalidateUnifiedGraph: () => void };

  if ('http' in config) {
    const executor = buildHTTPExecutor({
      fetch: fetchAPI?.fetch,
      ...config.http,
    });
    supergraphYogaPlugin = useExecutor(executor) as any;
  } else if ('fusiongraph' in config) {
    supergraphYogaPlugin = useFusiongraph({
      getFusiongraph() {
        return handleUnifiedGraphConfig(
          config.fusiongraph || './fusiongraph.graphql',
          serveContext,
        );
      },
      transports: config.transports,
      polling: config.polling,
      additionalResolvers: config.additionalResolvers,
      transportBaseContext: serveContext,
    });
  } else if ('supergraph' in config) {
    supergraphYogaPlugin = useFusiongraph({
      getFusiongraph() {
        const supergraph$ = handleUnifiedGraphConfig(
          config.supergraph || './supergraph.graphql',
          serveContext,
        );
        serveContext.logger?.info?.(`Converting Federation Supergraph to Fusiongraph`);
        if (isPromise(supergraph$)) {
          return supergraph$.then(supergraph => convertSupergraphToFusiongraph(supergraph));
        }
        return convertSupergraphToFusiongraph(supergraph$);
      },
      transports: config.transports,
      polling: config.polling,
      additionalResolvers: config.additionalResolvers,
      transportBaseContext: serveContext,
    });
  }

  const defaultFetchPlugin: MeshServePlugin = {
    onFetch({ setFetchFn }) {
      setFetchFn(fetchAPI.fetch);
    },
    onYogaInit({ yoga }) {
      const onFetchHooks: OnFetchHook<MeshServeContext>[] = [];

      for (const plugin of yoga.getEnveloped._plugins as MeshServePlugin[]) {
        if (plugin.onFetch) {
          onFetchHooks.push(plugin.onFetch);
        }
      }

      wrappedFetchFn = wrapFetchWithHooks(onFetchHooks);
    },
  };

  const yoga = createYoga<unknown, MeshServeContext>({
    fetchAPI: config.fetchAPI,
    logging: config.logging == null ? new DefaultLogger() : config.logging,
    plugins: [defaultFetchPlugin, supergraphYogaPlugin, ...(config.plugins?.(serveContext) || [])],
    context({ request, req, connectionParams }: any) {
      // Maybe Node-like environment
      if (req?.headers) {
        return {
          ...serveContext,
          headers: getHeadersObj(req.headers),
          connectionParams,
        };
      }
      // Fetch environment
      if (request?.headers) {
        return {
          ...serveContext,
          headers: getHeadersObj(request.headers),
          connectionParams,
        };
      }
      return serveContext;
    },
    cors: config.cors,
    graphiql: config.graphiql,
    batching: config.batching,
    graphqlEndpoint: config.graphqlEndpoint,
    maskedErrors: config.maskedErrors,
  });

  fetchAPI ||= yoga.fetchAPI;
  logger = yoga.logger as Logger;

  Object.defineProperty(yoga, 'invalidateUnifiedGraph', {
    value: supergraphYogaPlugin.invalidateUnifiedGraph,
    configurable: true,
  });

  return yoga as YogaServerInstance<unknown, MeshServeContext> & { invalidateUnifiedGraph(): void };
}
