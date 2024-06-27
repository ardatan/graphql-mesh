// eslint-disable-next-line import/no-nodejs-modules
import type { IncomingMessage } from 'node:http';
import AsyncDisposableStack from 'disposablestack/AsyncDisposableStack';
import { GraphQLSchema, parse } from 'graphql';
import {
  createYoga,
  FetchAPI,
  GraphiQLOptions,
  isAsyncIterable,
  useReadinessCheck,
  YogaServerInstance,
  type Plugin,
} from 'graphql-yoga';
import { GraphiQLOptionsOrFactory } from 'graphql-yoga/typings/plugins/use-graphiql.js';
import { createSupergraphSDLFetcher } from '@graphql-hive/client';
import {
  handleFederationSupergraph,
  isDisposable,
  OnSubgraphExecuteHook,
  UnifiedGraphManager,
  UnifiedGraphManagerOptions,
} from '@graphql-mesh/fusion-runtime';
import useMeshHive from '@graphql-mesh/plugin-hive';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Logger, MeshPlugin, OnDelegateHook, OnFetchHook } from '@graphql-mesh/types';
import {
  DefaultLogger,
  getHeadersObj,
  LogLevel,
  mapMaybePromise,
  wrapFetchWithHooks,
} from '@graphql-mesh/utils';
import { useExecutor } from '@graphql-tools/executor-yoga';
import { MaybePromise } from '@graphql-tools/utils';
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
  let logger: Logger;
  if (config.logging == null) {
    logger = new DefaultLogger();
  } else if (typeof config.logging === 'boolean') {
    logger = config.logging ? new DefaultLogger() : new DefaultLogger('', LogLevel.silent);
  }
  if (typeof config.logging === 'number') {
    logger = new DefaultLogger(undefined, config.logging);
  } else if (typeof config.logging === 'object') {
    logger = config.logging;
  }
  const onFetchHooks: OnFetchHook<MeshServeContext>[] = [];
  const wrappedFetchFn = wrapFetchWithHooks(onFetchHooks);

  const configContext: MeshServeConfigContext = {
    fetch: wrappedFetchFn,
    logger,
    cwd: globalThis.process?.cwd(),
    cache: 'cache' in config ? config.cache : undefined,
    pubsub: 'pubsub' in config ? config.pubsub : undefined,
  };

  let unifiedGraphPlugin: Plugin<unknown>;

  const readinessCheckEndpoint = config.readinessCheckEndpoint || '/readiness';
  const onSubgraphExecuteHooks: OnSubgraphExecuteHook[] = [];
  // TODO: Will be deleted after v0
  const onDelegateHooks: OnDelegateHook<unknown>[] = [];

  let unifiedGraph: GraphQLSchema;
  let schemaInvalidator: () => void;
  let schemaFetcher: () => MaybePromise<GraphQLSchema>;
  let contextBuilder: <T>(context: T) => MaybePromise<T>;
  let readinessChecker: () => MaybePromise<boolean>;
  let registryPlugin: MeshPlugin<unknown> = {};

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
    executorPlugin.onSchemaChange = function onSchemaChange(payload) {
      unifiedGraph = payload.schema;
    };
    unifiedGraphPlugin = executorPlugin;
    readinessChecker = () => {
      const res$ = proxyExecutor({
        document: parse(`query { __typename }`),
      });
      return mapMaybePromise(res$, res => !isAsyncIterable(res) && !!res.data?.__typename);
    };
    schemaInvalidator = () => executorPlugin.invalidateUnifiedGraph();
  } else {
    let unifiedGraphFetcher: UnifiedGraphManagerOptions<unknown>['getUnifiedGraph'];
    if ('supergraph' in config) {
      unifiedGraphFetcher = () => handleUnifiedGraphConfig(config.supergraph, configContext);
    } else if ('hive' in config) {
      const fetcher = createSupergraphSDLFetcher(config.hive);
      unifiedGraphFetcher = () => fetcher().then(({ supergraphSdl }) => supergraphSdl);
      registryPlugin = useMeshHive({
        enabled: true,
        ...config.hive,
        ...configContext,
        logger: configContext.logger.child('Hive'),
      });
    }
    const unifiedGraphManager = new UnifiedGraphManager({
      getUnifiedGraph: unifiedGraphFetcher,
      handleUnifiedGraph: handleFederationSupergraph,
      transports: config.transports,
      polling: config.polling,
      additionalResolvers: config.additionalResolvers,
      transportBaseContext: configContext,
      onDelegateHooks,
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
      onDelegateHooks.splice(0, onDelegateHooks.length);
      for (const plugin of plugins as MeshServePlugin[]) {
        if (plugin.onFetch) {
          onFetchHooks.push(plugin.onFetch);
        }
        if (plugin.onSubgraphExecute) {
          onSubgraphExecuteHooks.push(plugin.onSubgraphExecute);
        }
        // @ts-expect-error For backward compatibility
        if (plugin.onDelegate) {
          // @ts-expect-error For backward compatibility
          onDelegateHooks.push(plugin.onDelegate);
        }
        if (isDisposable(plugin)) {
          disposableStack.use(plugin);
        }
      }
    },
  };

  let graphiqlOptionsOrFactory: GraphiQLOptionsOrFactory<unknown> | false;

  if (config.graphiql == null || config.graphiql === true) {
    graphiqlOptionsOrFactory = {
      title: 'GraphiQL Mesh',
    };
  } else if (config.graphiql === false) {
    graphiqlOptionsOrFactory = false;
  } else if (typeof config.graphiql === 'object') {
    graphiqlOptionsOrFactory = {
      title: 'GraphiQL Mesh',
      ...config.graphiql,
    };
  } else if (typeof config.graphiql === 'function') {
    const userGraphiqlFactory = config.graphiql;
    // @ts-expect-error PromiseLike is not compatible with Promise
    graphiqlOptionsOrFactory = function graphiqlOptionsFactoryForMesh(...args) {
      const options = userGraphiqlFactory(...args);
      return mapMaybePromise(options, resolvedOpts => {
        if (resolvedOpts === false) {
          return false;
        }
        if (resolvedOpts === true) {
          return {
            title: 'GraphiQL Mesh',
          };
        }
        return {
          title: 'GraphiQL Mesh',
          ...resolvedOpts,
        };
      });
    };
  }

  const yoga = createYoga<unknown, MeshServeContext>({
    // @ts-expect-error PromiseLike is not compatible with Promise
    schema: schemaFetcher,
    fetchAPI: config.fetchAPI,
    logging: logger,
    plugins: [
      defaultMeshPlugin,
      unifiedGraphPlugin,
      readinessCheckPlugin,
      registryPlugin,
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
    graphiql: graphiqlOptionsOrFactory,
    batching: config.batching,
    graphqlEndpoint: config.graphqlEndpoint,
    maskedErrors: config.maskedErrors,
    healthCheckEndpoint: config.healthCheckEndpoint || '/healthcheck',
    landingPage: config.landingPage,
  });

  fetchAPI ||= yoga.fetchAPI;

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
