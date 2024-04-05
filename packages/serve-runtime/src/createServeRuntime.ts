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

  if ('fusiongraph' in config) {
    supergraphYogaPlugin = useFusiongraph({
      getFusiongraph: () => handleUnifiedGraphConfig(config.fusiongraph, configContext),
      transports: config.transports,
      polling: config.polling,
      additionalResolvers: config.additionalResolvers,
      transportBaseContext: configContext,
      readinessCheckEndpoint: config.readinessCheckEndpoint || '/readiness',
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
      readinessCheckEndpoint: config.readinessCheckEndpoint || '/readiness',
    });
  } else if ('proxy' in config) {
    let schema: GraphQLSchema;
    const proxyExecutor = getProxyExecutor(config, configContext, () => schema);
    // TODO: fix useExecutor typings to inherit the context
    const executorPlugin = useExecutor(proxyExecutor) as unknown as Plugin<
      MeshServeContext & TContext
    > & {
      invalidateSupergraph: () => void;
    };
    supergraphYogaPlugin = {
      onPluginInit({ addPlugin }) {
        addPlugin(executorPlugin);
        addPlugin(
          // TODO: fix useReadinessCheck typings to inherit the context
          useReadinessCheck({
            endpoint: config.readinessCheckEndpoint || '/readiness',
            check() {
              const res$ = proxyExecutor({
                document: parse(`query { __typename }`),
              });
              if (isPromise(res$)) {
                return res$.then(
                  res => !isAsyncIterable(res) && !!res.data?.__typename,
                ) as Promise<any>;
              }
              if (!isAsyncIterable(res$)) {
                return !!res$.data?.__typename;
              }
              return false;
            },
          }) as any,
        );
      },
      onSchemaChange: payload => {
        schema = payload.schema;
      },
      invalidateUnifiedGraph: () =>
        (executorPlugin.invalidateSupergraph || (executorPlugin as any).invalidateUnifiedGraph)(),
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
  });

  fetchAPI ||= yoga.fetchAPI;
  logger = yoga.logger as Logger;

  Object.defineProperty(yoga, 'invalidateUnifiedGraph', {
    value: supergraphYogaPlugin.invalidateUnifiedGraph,
    configurable: true,
  });

  return yoga as YogaServerInstance<unknown, MeshServeContext> & { invalidateUnifiedGraph(): void };
}
