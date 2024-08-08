// eslint-disable-next-line import/no-nodejs-modules
import type { IncomingMessage } from 'node:http';
import type { ExecutionArgs, GraphQLSchema } from 'graphql';
import { buildSchema, parse } from 'graphql';
import {
  createYoga,
  isAsyncIterable,
  mergeSchemas,
  useReadinessCheck,
  type LandingPageRenderer,
  type Plugin,
  type YogaServerInstance,
} from 'graphql-yoga';
import type { GraphiQLOptionsOrFactory } from 'graphql-yoga/typings/plugins/use-graphiql.js';
import { createSupergraphSDLFetcher } from '@graphql-hive/apollo';
import { process } from '@graphql-mesh/cross-helpers';
import type {
  OnSubgraphExecuteHook,
  TransportEntry,
  UnifiedGraphManagerOptions,
} from '@graphql-mesh/fusion-runtime';
import {
  getOnSubgraphExecute,
  getStitchingDirectivesTransformerForSubschema,
  handleFederationSubschema,
  restoreExtraDirectives,
  UnifiedGraphManager,
} from '@graphql-mesh/fusion-runtime';
import useMeshHive from '@graphql-mesh/plugin-hive';
// eslint-disable-next-line import/no-extraneous-dependencies
import type { Logger, MeshPlugin, OnDelegateHook, OnFetchHook } from '@graphql-mesh/types';
import {
  DefaultLogger,
  getHeadersObj,
  isDisposable,
  LogLevel,
  makeAsyncDisposable,
  mapMaybePromise,
  wrapFetchWithHooks,
} from '@graphql-mesh/utils';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';
import { delegateToSchema, type SubschemaConfig } from '@graphql-tools/delegate';
import {
  getDirectiveExtensions,
  mergeDeep,
  parseSelectionSet,
  type Executor,
  type IResolvers,
  type MaybePromise,
  type TypeSource,
} from '@graphql-tools/utils';
import { schemaFromExecutor, wrapSchema } from '@graphql-tools/wrap';
import { AsyncDisposableStack } from '@whatwg-node/disposablestack';
import { getProxyExecutor } from './getProxyExecutor.js';
import { getUnifiedGraphSDL, handleUnifiedGraphConfig } from './handleUnifiedGraphConfig.js';
import landingPageHtml from './landing-page-html.js';
import type {
  MeshServeConfig,
  MeshServeConfigContext,
  MeshServeContext,
  MeshServePlugin,
} from './types.js';
import { useChangingSchema } from './useChangingSchema.js';
import { useCompleteSubscriptionsOnDispose } from './useCompleteSubscriptionsOnDispose.js';
import { useCompleteSubscriptionsOnSchemaChange } from './useCompleteSubscriptionsOnSchemaChange.js';
import { useFetchDebug } from './useFetchDebug.js';
import { useRequestId } from './useRequestId.js';
import { useSubgraphExecuteDebug } from './useSubgraphExecuteDebug.js';
import { checkIfDataSatisfiesSelectionSet } from './utils.js';

export type MeshServeRuntime<TContext extends Record<string, any> = Record<string, any>> =
  YogaServerInstance<unknown, TContext> & {
    invalidateUnifiedGraph(): void;
  } & AsyncDisposable;

export function createServeRuntime<TContext extends Record<string, any> = Record<string, any>>(
  config: MeshServeConfig<TContext>,
): MeshServeRuntime<TContext> {
  let fetchAPI = config.fetchAPI;
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
    cwd: 'cwd' in config ? config.cwd : process.cwd?.(),
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
  let getSchema: () => MaybePromise<GraphQLSchema> = () => unifiedGraph;
  let setSchema: (schema: GraphQLSchema) => void = schema => {
    unifiedGraph = schema;
  };
  let contextBuilder: <T>(context: T) => MaybePromise<T>;
  let readinessChecker: () => MaybePromise<boolean>;
  const hiveRegistryPlugin: MeshPlugin<unknown> =
    config.reporting?.type === 'hive'
      ? useMeshHive({
          ...configContext,
          logger: configContext.logger.child('Hive'),
          ...config.reporting,
        })
      : {};
  let subgraphInformationHTMLRenderer: () => MaybePromise<string> = () => '';

  const disposableStack = new AsyncDisposableStack();

  if ('proxy' in config) {
    const proxyExecutor = getProxyExecutor({
      config,
      configContext,
      getSchema() {
        return unifiedGraph;
      },
      onSubgraphExecuteHooks,
      disposableStack,
    });
    function createExecuteFnFromExecutor(executor: Executor) {
      return function executeFn(args: ExecutionArgs) {
        return executor({
          document: args.document,
          variables: args.variableValues,
          operationName: args.operationName,
          rootValue: args.rootValue,
          context: args.contextValue,
        });
      };
    }
    const executeFn = createExecuteFnFromExecutor(proxyExecutor);

    let currentTimeout: ReturnType<typeof setTimeout>;
    const polling = config.polling;
    function continuePolling() {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
      if (polling) {
        currentTimeout = setTimeout(schemaFetcher, polling);
      }
    }
    function pausePolling() {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
    }
    let lastFetchedSdl: string;
    let initialFetch$: MaybePromise<true>;
    let schemaFetcher: () => MaybePromise<true>;
    if (config.cdn) {
      const { endpoint, key } = config.cdn;
      schemaFetcher = function fetchSchemaFromCDN() {
        pausePolling();
        initialFetch$ = mapMaybePromise(
          configContext.fetch(endpoint, {
            headers: {
              'X-Hive-CDN-Key': key,
            },
          }),
          res =>
            mapMaybePromise(res.text(), sdl => {
              if (lastFetchedSdl == null || lastFetchedSdl !== sdl) {
                unifiedGraph = buildSchema(sdl, {
                  assumeValid: true,
                  assumeValidSDL: true,
                });
                setSchema(unifiedGraph);
              }
              continuePolling();
              return true;
            }),
        );
        return initialFetch$;
      };
    } else {
      schemaFetcher = function fetchSchemaWithExecutor() {
        pausePolling();
        return mapMaybePromise(
          schemaFromExecutor(proxyExecutor, configContext, {
            assumeValid: true,
          }),
          schema => {
            unifiedGraph = schema;
            setSchema(schema);
            continuePolling();
            return true;
          },
          err => {
            configContext.logger.warn(`Failed to introspect schema`, err);
            return true;
          },
        );
      };
    }
    getSchema = () => {
      if (unifiedGraph != null) {
        return unifiedGraph;
      }
      if (initialFetch$ != null) {
        return mapMaybePromise(initialFetch$, () => unifiedGraph);
      }
      if (!initialFetch$) {
        return mapMaybePromise(schemaFetcher(), () => unifiedGraph);
      }
    };
    disposableStack.defer(pausePolling);
    const shouldSkipValidation = 'skipValidation' in config ? config.skipValidation : false;
    const executorPlugin: Plugin = {
      onExecute({ setExecuteFn }) {
        setExecuteFn(executeFn);
      },
      onSubscribe({ setSubscribeFn }) {
        setSubscribeFn(executeFn);
      },
      onValidate({ params, setResult }) {
        if (shouldSkipValidation || !params.schema) {
          setResult([]);
        }
      },
    };
    unifiedGraphPlugin = executorPlugin;
    readinessChecker = () => {
      const res$ = proxyExecutor({
        document: parse(`query ReadinessCheck { __typename }`),
      });
      return mapMaybePromise(res$, res => !isAsyncIterable(res) && !!res.data?.__typename);
    };
    schemaInvalidator = () => {
      unifiedGraph = undefined;
      initialFetch$ = schemaFetcher();
    };
    subgraphInformationHTMLRenderer = () => {
      const endpoint = config.proxy.endpoint;
      const htmlParts: string[] = [];
      htmlParts.push(`<section class="supergraph-information">`);
      htmlParts.push(`<h3>Proxy: <a href="${endpoint}">${endpoint}</a></h3>`);
      if (config.cdn) {
        htmlParts.push(
          `<p><strong>Source: </strong> <i>${config.cdn.type === 'hive' ? 'Hive' : 'Unknown'} CDN</i></p>`,
        );
      }
      htmlParts.push(`</section>`);
      return htmlParts.join('');
    };
  } else if ('subgraph' in config) {
    const subgraphInConfig = config.subgraph;
    let getSubschemaConfig$: MaybePromise<boolean>;
    let subschemaConfig: SubschemaConfig;
    function getSubschemaConfig() {
      if (getSubschemaConfig$) {
        return getSubschemaConfig$;
      }
      return mapMaybePromise(
        handleUnifiedGraphConfig(subgraphInConfig, configContext),
        newUnifiedGraph => {
          unifiedGraph = newUnifiedGraph;
          unifiedGraph = restoreExtraDirectives(unifiedGraph);
          subschemaConfig = {
            name: getDirectiveExtensions(unifiedGraph)?.transport?.[0]?.subgraph,
            schema: unifiedGraph,
          };
          const transportEntryMap: Record<string, TransportEntry> = {};
          const additionalTypeDefs: TypeSource[] = [];
          const additionalResolvers: IResolvers<unknown, any>[] = [];

          const stitchingDirectivesTransformer = getStitchingDirectivesTransformerForSubschema();
          const onSubgraphExecute = getOnSubgraphExecute({
            onSubgraphExecuteHooks,
            transports: config.transports,
            transportContext: configContext,
            transportEntryMap,
            getSubgraphSchema() {
              return unifiedGraph;
            },
            transportExecutorStack: disposableStack,
          });
          subschemaConfig = handleFederationSubschema({
            subschemaConfig,
            transportEntryMap,
            additionalTypeDefs,
            additionalResolvers,
            stitchingDirectivesTransformer,
            onSubgraphExecute,
          });
          // TODO: Find better alternative later
          unifiedGraph = wrapSchema(subschemaConfig);
          unifiedGraph = mergeSchemas({
            assumeValid: true,
            assumeValidSDL: true,
            schemas: [unifiedGraph],
            typeDefs: [
              parse(/* GraphQL */ `
                  type Query {
                    _entities(representations: [_Any!]!): [_Entity]!
                    _service: _Service!
                  }

                  scalar _Any
                  union _Entity = ${Object.keys(subschemaConfig.merge || {}).join(' | ')}
                  type _Service {
                    sdl: String
                  }
              `),
            ],
            resolvers: {
              Query: {
                _entities(_root, args, context, info) {
                  if (Array.isArray(args.representations)) {
                    return args.representations.map(representation => {
                      const typeName = representation.__typename;
                      const mergeConfig = subschemaConfig.merge[typeName];
                      const entryPoints = mergeConfig?.entryPoints || [mergeConfig];
                      const satisfiedEntryPoint = entryPoints.find(entryPoint => {
                        if (entryPoint.selectionSet) {
                          const selectionSet = parseSelectionSet(entryPoint.selectionSet, {
                            noLocation: true,
                          });
                          return checkIfDataSatisfiesSelectionSet(selectionSet, representation);
                        }
                        return true;
                      });
                      if (satisfiedEntryPoint) {
                        if (satisfiedEntryPoint.key) {
                          return mapMaybePromise(
                            batchDelegateToSchema({
                              schema: subschemaConfig,
                              fieldName: satisfiedEntryPoint.fieldName,
                              key: satisfiedEntryPoint.key(representation),
                              argsFromKeys: satisfiedEntryPoint.argsFromKeys,
                              valuesFromResults: satisfiedEntryPoint.valuesFromResults,
                              context,
                              info,
                            }),
                            res => mergeDeep([representation, res]),
                          );
                        }
                        if (satisfiedEntryPoint.args) {
                          return mapMaybePromise(
                            delegateToSchema({
                              schema: subschemaConfig,
                              fieldName: satisfiedEntryPoint.fieldName,
                              args: satisfiedEntryPoint.args(representation),
                              context,
                              info,
                            }),
                            res => mergeDeep([representation, res]),
                          );
                        }
                      }
                      return representation;
                    });
                  }
                  return [];
                },
                _service() {
                  return {
                    sdl() {
                      return getUnifiedGraphSDL(newUnifiedGraph);
                    },
                  };
                },
              },
            },
          });
          return true;
        },
      );
    }
    getSchema = () => mapMaybePromise(getSubschemaConfig(), () => unifiedGraph);
  } /** 'supergraph' in config */ else {
    let unifiedGraphFetcher: UnifiedGraphManagerOptions<unknown>['getUnifiedGraph'];
    let supergraphLoadedPlace: string;

    if (
      typeof config.supergraph === 'object' &&
      'type' in config.supergraph &&
      config.supergraph.type === 'hive'
    ) {
      // hive cdn
      const { endpoint, key } = config.supergraph;
      supergraphLoadedPlace = 'Hive CDN <br>' + endpoint;
      const fetcher = createSupergraphSDLFetcher({
        endpoint,
        key,
        logger: configContext.logger.child('Hive CDN'),
      });
      unifiedGraphFetcher = () => fetcher().then(({ supergraphSdl }) => supergraphSdl);
    } else {
      // local or remote
      unifiedGraphFetcher = () =>
        handleUnifiedGraphConfig(
          // @ts-expect-error TODO: what's up with type narrowing
          config.supergraph,
          configContext,
        );
      if (typeof config.supergraph === 'function') {
        const fnName = config.supergraph.name || '';
        supergraphLoadedPlace = `a custom loader ${fnName}`;
      } else if (typeof config.supergraph === 'string') {
        supergraphLoadedPlace = config.supergraph;
      }
    }

    const unifiedGraphManager = new UnifiedGraphManager({
      getUnifiedGraph: unifiedGraphFetcher,
      onSchemaChange(unifiedGraph) {
        setSchema(unifiedGraph);
      },
      transports: config.transports,
      transportEntryAdditions: config.transportEntries,
      polling: config.polling,
      additionalResolvers: config.additionalResolvers,
      transportContext: configContext,
      onDelegateHooks,
      onSubgraphExecuteHooks,
    });
    getSchema = () => unifiedGraphManager.getUnifiedGraph();
    readinessChecker = () =>
      mapMaybePromise(
        unifiedGraphManager.getUnifiedGraph(),
        schema => {
          if (!schema) {
            logger.debug(`Readiness check failed: Supergraph cannot be loaded`);
            return false;
          }
          logger.debug(`Readiness check passed: Supergraph loaded`);
          return true;
        },
        err => {
          logger.debug(
            `Readiness check failed due to errors on loading supergraph:\n${err.stack || err.message}`,
          );
          logger.error(err);
          return false;
        },
      );
    schemaInvalidator = () => unifiedGraphManager.invalidateUnifiedGraph();
    contextBuilder = base => unifiedGraphManager.getContext(base);
    disposableStack.use(unifiedGraphManager);
    subgraphInformationHTMLRenderer = async () => {
      const htmlParts: string[] = [];
      let loaded = false;
      let loadError: Error;
      let transportEntryMap: Record<string, TransportEntry>;
      try {
        transportEntryMap = await unifiedGraphManager.getTransportEntryMap();
        loaded = true;
      } catch (e) {
        loaded = false;
        loadError = e;
      }
      if (loaded) {
        htmlParts.push(`<h3>Supergraph Status: Loaded ✅</h3>`);
        if (supergraphLoadedPlace) {
          htmlParts.push(`<p><strong>Source: </strong> <i>${supergraphLoadedPlace}</i></p>`);
        }
        htmlParts.push(`<table>`);
        htmlParts.push(`<tr><th>Subgraph</th><th>Transport</th><th>Location</th></tr>`);
        for (const subgraphName in transportEntryMap) {
          const transportEntry = transportEntryMap[subgraphName];
          htmlParts.push(`<tr>`);
          htmlParts.push(`<td>${subgraphName}</td>`);
          htmlParts.push(`<td>${transportEntry.kind}</td>`);
          htmlParts.push(
            `<td><a href="${transportEntry.location}">${transportEntry.location}</a></td>`,
          );
          htmlParts.push(`</tr>`);
        }
        htmlParts.push(`</table>`);
      } else {
        htmlParts.push(`<h3>Status: Failed ❌</h3>`);
        if (supergraphLoadedPlace) {
          htmlParts.push(`<p><strong>Source: </strong> <i>${supergraphLoadedPlace}</i></p>`);
        }
        htmlParts.push(`<h3>Error:</h3>`);
        htmlParts.push(`<pre>${loadError.stack}</pre>`);
      }
      return `<section class="supergraph-information">${htmlParts.join('')}</section>`;
    };
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

  let landingPageRenderer: LandingPageRenderer | boolean;

  if (config.landingPage == null || config.landingPage === true) {
    landingPageRenderer = async function meshLandingPageRenderer(opts) {
      const subgraphHtml = await subgraphInformationHTMLRenderer();
      return new opts.fetchAPI.Response(
        landingPageHtml
          .replace(/__GRAPHIQL_LINK__/g, opts.graphqlEndpoint)
          .replace(/__REQUEST_PATH__/g, opts.url.pathname)
          .replace(/__SUBGRAPH_HTML__/g, subgraphHtml),
        {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'text/html',
          },
        },
      );
    };
  } else if (typeof config.landingPage === 'function') {
    landingPageRenderer = config.landingPage;
  } else if (config.landingPage === false) {
    landingPageRenderer = false;
  }

  const yoga = createYoga<unknown, MeshServeContext & TContext>({
    fetchAPI: config.fetchAPI,
    logging: logger,
    plugins: [
      defaultMeshPlugin,
      unifiedGraphPlugin,
      readinessCheckPlugin,
      hiveRegistryPlugin,
      useChangingSchema(getSchema, _setSchema => {
        setSchema = _setSchema;
      }),
      useCompleteSubscriptionsOnDispose(disposableStack),
      useCompleteSubscriptionsOnSchemaChange(),
      useRequestId(),
      useSubgraphExecuteDebug(configContext),
      useFetchDebug(configContext),
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
    landingPage: landingPageRenderer,
  });

  fetchAPI ||= yoga.fetchAPI;

  Object.defineProperties(yoga, {
    invalidateUnifiedGraph: {
      value: schemaInvalidator,
      configurable: true,
    },
  });

  return makeAsyncDisposable(yoga, () =>
    disposableStack.disposeAsync(),
  ) as any as MeshServeRuntime<TContext>;
}
