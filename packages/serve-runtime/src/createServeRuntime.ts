// eslint-disable-next-line import/no-nodejs-modules
import type { IncomingMessage } from 'node:http';
import { GraphQLSchema, parse } from 'graphql';
import {
  createYoga,
  FetchAPI,
  isAsyncIterable,
  useReadinessCheck,
  YogaServerInstance,
  type Plugin,
} from 'graphql-yoga';
import { handleFederationSupergraph, useUnifiedGraph } from '@graphql-mesh/fusion-runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Logger, MeshFetch, OnFetchHook } from '@graphql-mesh/types';
import {
  DefaultLogger,
  getHeadersObj,
  mapMaybePromise,
  wrapFetchWithHooks,
} from '@graphql-mesh/utils';
import { useExecutor } from '@graphql-tools/executor-yoga';
import { getProxyExecutor } from './getProxyExecutor.js';
import { handleUnifiedGraphConfig } from './handleUnifiedGraphConfig.js';
import {
  MeshServeConfig,
  MeshServeConfigContext,
  MeshServeContext,
  MeshServePlugin,
} from './types.js';

export function createServeRuntime<TContext extends Record<string, any> = Record<string, any>>(
  config: MeshServeConfig<TContext>,
) {
  let fetchAPI: Partial<FetchAPI> = config.fetchAPI;
  // eslint-disable-next-line prefer-const
  let logger: Logger;
  let wrappedFetchFn: MeshFetch;

  const configContext: MeshServeConfigContext = {
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

  let supergraphYogaPlugin: Plugin<MeshServeContext & TContext> & {
    invalidateUnifiedGraph: () => void;
  };

  const readinessCheckEndpoint = config.readinessCheckEndpoint || '/readiness';

  if ('fusiongraph' in config) {
    supergraphYogaPlugin = useUnifiedGraph({
      getUnifiedGraph: () => handleUnifiedGraphConfig(config.fusiongraph, configContext),
      transports: config.transports,
      polling: config.polling,
      additionalResolvers: config.additionalResolvers,
      transportBaseContext: configContext,
      readinessCheckEndpoint,
    });
  } else if ('supergraph' in config) {
    supergraphYogaPlugin = useUnifiedGraph({
      getUnifiedGraph: () => handleUnifiedGraphConfig(config.supergraph, configContext),
      handleUnifiedGraph: handleFederationSupergraph,
      transports: config.transports,
      polling: config.polling,
      additionalResolvers: config.additionalResolvers,
      transportBaseContext: configContext,
      readinessCheckEndpoint,
    });
  } else if ('proxy' in config) {
    let schema: GraphQLSchema;
    const proxyExecutor = getProxyExecutor(config, configContext, () => schema);
    const executorPlugin = useExecutor(proxyExecutor);
    supergraphYogaPlugin = {
      onPluginInit({ addPlugin }) {
        // @ts-expect-error Fix this
        addPlugin(executorPlugin);
        addPlugin(
          // @ts-expect-error Fix this
          useReadinessCheck({
            endpoint: readinessCheckEndpoint,
            // @ts-expect-error PromiseLike is not compatible with Promise
            check() {
              const res$ = proxyExecutor({
                document: parse(`query { __typename }`),
              });
              return mapMaybePromise(res$, res => !isAsyncIterable(res) && !!res.data?.__typename);
            },
          }),
        );
      },
      onSchemaChange: payload => {
        schema = payload.schema;
      },
      invalidateUnifiedGraph() {
        return executorPlugin.invalidateUnifiedGraph();
      },
    };
  }

  const defaultFetchPlugin: MeshServePlugin = {
    onFetch({ setFetchFn }) {
      setFetchFn(fetchAPI.fetch);
    },
    onYogaInit({ yoga }) {
      const onFetchHooks: OnFetchHook<MeshServeContext>[] = [];

      for (const plugin of yoga.getEnveloped._plugins as unknown as MeshServePlugin[]) {
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
    context: ({ request, params, ...rest }) => {
      // TODO: I dont like this cast, but it's necessary
      const { req, connectionParams } = rest as {
        req?: IncomingMessage;
        connectionParams?: Record<string, string>;
      };
      return {
        ...configContext,
        request,
        params,
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
      };
    },
    cors: config.cors,
    graphiql: config.graphiql,
    batching: config.batching,
    graphqlEndpoint: config.graphqlEndpoint,
    maskedErrors: config.maskedErrors,
    healthCheckEndpoint: config.healthCheckEndpoint || '/healthcheck',
    landingPage: config.landingPage,
  });

  fetchAPI ||= yoga.fetchAPI;
  logger = yoga.logger as Logger;

  Object.defineProperty(yoga, 'invalidateUnifiedGraph', {
    value: supergraphYogaPlugin.invalidateUnifiedGraph,
    configurable: true,
  });

  return yoga as YogaServerInstance<unknown, MeshServeContext> & { invalidateUnifiedGraph(): void };
}
