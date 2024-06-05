// eslint-disable-next-line import/no-nodejs-modules
import type { IncomingMessage } from 'node:http';
import AsyncDisposableStack from 'disposablestack/AsyncDisposableStack';
import { GraphQLSchema, parse } from 'graphql';
import {
  createYoga,
  FetchAPI,
  isAsyncIterable,
  useReadinessCheck,
  YogaServerInstance,
  type Plugin,
} from 'graphql-yoga';
import {
  handleFederationSupergraph,
  handleFusiongraph,
  isDisposable,
  OnSubgraphExecuteHook,
  UnifiedGraphHandler,
  UnifiedGraphManager,
} from '@graphql-mesh/fusion-runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Logger, OnFetchHook } from '@graphql-mesh/types';
import {
  DefaultLogger,
  getHeadersObj,
  mapMaybePromise,
  wrapFetchWithHooks,
} from '@graphql-mesh/utils';
import { useExecutor } from '@graphql-tools/executor-yoga';
import { MaybePromise } from '@graphql-tools/utils';
import { getProxyExecutor } from './getProxyExecutor.js';
import { handleUnifiedGraphConfig, UnifiedGraphConfig } from './handleUnifiedGraphConfig.js';
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
  const onFetchHooks: OnFetchHook<MeshServeContext>[] = [];
  const wrappedFetchFn = wrapFetchWithHooks(onFetchHooks);

  const configContext: MeshServeConfigContext = {
    fetch: wrappedFetchFn,
    get logger() {
      return logger;
    },
    cwd: globalThis.process?.cwd(),
    cache: 'cache' in config ? config.cache : undefined,
    pubsub: 'pubsub' in config ? config.pubsub : undefined,
  };

  let unifiedGraphPlugin: Plugin<unknown>;

  const readinessCheckEndpoint = config.readinessCheckEndpoint || '/readiness';
  const onSubgraphExecuteHooks: OnSubgraphExecuteHook[] = [];

  let unifiedGraph: GraphQLSchema;
  let schemaInvalidator: () => void;
  let schemaFetcher: () => MaybePromise<GraphQLSchema>;
  let contextBuilder: <T>(context: T) => MaybePromise<T>;
  let readinessChecker: () => MaybePromise<boolean>;

  const disposableStack = new AsyncDisposableStack();

  if ('proxy' in config) {
    const proxyExecutor = getProxyExecutor({
      config,
      configContext,
      getSchema: () => unifiedGraph,
      onSubgraphExecuteHooks,
      disposableStack,
    });
    const executorPlugin = useExecutor(proxyExecutor);
    unifiedGraphPlugin = executorPlugin;
    readinessChecker = () => {
      const res$ = proxyExecutor({
        document: parse(`query { __typename }`),
      });
      return mapMaybePromise(res$, res => !isAsyncIterable(res) && !!res.data?.__typename);
    };
    schemaInvalidator = () => executorPlugin.invalidateUnifiedGraph();
  } else {
    let handleUnifiedGraph: UnifiedGraphHandler;
    let unifiedGraphInConfig: UnifiedGraphConfig;
    if ('fusiongraph' in config) {
      handleUnifiedGraph = handleFusiongraph;
      unifiedGraphInConfig = config.fusiongraph;
    } else if ('supergraph' in config) {
      handleUnifiedGraph = handleFederationSupergraph;
      unifiedGraphInConfig = config.supergraph;
    }
    const unifiedGraphManager = new UnifiedGraphManager({
      getUnifiedGraph: () => handleUnifiedGraphConfig(unifiedGraphInConfig, configContext),
      handleUnifiedGraph,
      transports: config.transports,
      polling: config.polling,
      additionalResolvers: config.additionalResolvers,
      transportBaseContext: configContext,
      readinessCheckEndpoint,
      onDelegateHooks: [],
      onSubgraphExecuteHooks,
    });
    schemaFetcher = () => unifiedGraphManager.getUnifiedGraph();
    readinessChecker = () =>
      mapMaybePromise(unifiedGraphManager.getUnifiedGraph(), schema => !!schema);
    schemaInvalidator = () => unifiedGraphManager.invalidateUnifiedGraph();
    contextBuilder = base => unifiedGraphManager.getContext(base);
    disposableStack.use(unifiedGraphManager);
  }

  const readinessCheckPlugin = useReadinessCheck({
    endpoint: readinessCheckEndpoint,
    // @ts-expect-error PromiseLike is not compatible with Promise
    check: readinessChecker,
  });

  const defaultMeshPlugin: MeshServePlugin = {
    onFetch({ setFetchFn }) {
      setFetchFn(fetchAPI.fetch);
    },
    onPluginInit({ plugins }) {
      onFetchHooks.splice(0, onFetchHooks.length);
      onSubgraphExecuteHooks.splice(0, onSubgraphExecuteHooks.length);
      for (const plugin of plugins as MeshServePlugin[]) {
        if (plugin.onFetch) {
          onFetchHooks.push(plugin.onFetch);
        }
        if (plugin.onSubgraphExecute) {
          onSubgraphExecuteHooks.push(plugin.onSubgraphExecute);
        }
        if (isDisposable(plugin)) {
          disposableStack.use(plugin);
        }
      }
    },
  };

  const yoga = createYoga<unknown, MeshServeContext>({
    // @ts-expect-error PromiseLike is not compatible with Promise
    schema: schemaFetcher,
    fetchAPI: config.fetchAPI,
    logging: config.logging == null ? new DefaultLogger() : config.logging,
    plugins: [
      defaultMeshPlugin,
      unifiedGraphPlugin,
      readinessCheckPlugin,
      ...(config.plugins?.(configContext) || []),
    ],
    // @ts-expect-error PromiseLike is not compatible with Promise
    context({ request, params, ...rest }) {
      // TODO: I dont like this cast, but it's necessary
      const { req, connectionParams } = rest as {
        req?: IncomingMessage;
        connectionParams?: Record<string, string>;
      };
      const baseContext = {
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
      if (contextBuilder) {
        return contextBuilder(baseContext);
      }
      return baseContext;
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

  Object.defineProperties(yoga, {
    invalidateUnifiedGraph: {
      value: schemaInvalidator,
      configurable: true,
    },
    [Symbol.asyncDispose]: {
      value: () => disposableStack.disposeAsync(),
      configurable: true,
    },
  });

  return yoga as YogaServerInstance<unknown, MeshServeContext> & {
    invalidateUnifiedGraph(): void;
  } & AsyncDisposable;
}
