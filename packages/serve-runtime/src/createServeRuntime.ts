import { createYoga, FetchAPI, YogaServerInstance, type Plugin } from 'graphql-yoga';
import { convertSupergraphToFusiongraph } from '@graphql-mesh/fusion-federation';
import { useFusiongraph } from '@graphql-mesh/fusion-runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Logger, MeshFetch, OnFetchHook } from '@graphql-mesh/types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { DefaultLogger, getHeadersObj, wrapFetchWithHooks } from '@graphql-mesh/utils';
import { useExecutor } from '@graphql-tools/executor-yoga';
import { isPromise } from '@graphql-tools/utils';
import { getProxyExecutor } from './getProxyExecutor.js';
import { handleUnifiedGraphConfig } from './handleUnifiedGraphConfig.js';
import { MeshServeConfig, MeshServeContext, MeshServePlugin } from './types';

export function createServeRuntime(config: MeshServeConfig) {
  let fetchAPI: Partial<FetchAPI> = config.fetchAPI;
  // eslint-disable-next-line prefer-const
  let logger: Logger;
  let wrappedFetchFn: MeshFetch;

  const configContext = {
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

  if ('fusiongraph' in config) {
    supergraphYogaPlugin = useFusiongraph({
      getFusiongraph: () => handleUnifiedGraphConfig(config.fusiongraph, configContext),
      transports: config.transports,
      polling: config.polling,
      additionalResolvers: config.additionalResolvers,
      transportBaseContext: configContext,
    });
  } else if ('supergraph' in config) {
    supergraphYogaPlugin = useFusiongraph({
      getFusiongraph() {
        const supergraph$ = handleUnifiedGraphConfig(config.supergraph, configContext);
        configContext.logger?.info?.(`Converting Federation Supergraph to Fusiongraph`);
        if (isPromise(supergraph$)) {
          return supergraph$.then(supergraph => convertSupergraphToFusiongraph(supergraph));
        }
        return convertSupergraphToFusiongraph(supergraph$);
      },
      transports: config.transports,
      polling: config.polling,
      additionalResolvers: config.additionalResolvers,
      transportBaseContext: configContext,
    });
  } else if ('proxy' in config) {
    supergraphYogaPlugin = useExecutor(getProxyExecutor(config, configContext)) as any;
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
    plugins: [defaultFetchPlugin, supergraphYogaPlugin, ...(config.plugins?.(configContext) || [])],
    context: ({ request, req, connectionParams }: any) => ({
      ...configContext,
      headers:
        // Maybe Node-like environment
        req?.headers
          ? getHeadersObj(req.headers)
          : // Fetch environment
            request?.headers
            ? getHeadersObj(request.headers)
            : // Unknown environment
              {},
      connectionParams,
    }),
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
