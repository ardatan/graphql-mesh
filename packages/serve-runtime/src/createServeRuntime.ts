// eslint-disable-next-line import/no-nodejs-modules
import type { IncomingMessage } from 'node:http';
import type { GraphQLSchema } from 'graphql';
import { parse } from 'graphql';
import {
  createYoga,
  isAsyncIterable,
  mergeSchemas,
  Repeater,
  useReadinessCheck,
  type FetchAPI,
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
  handleFederationSupergraph,
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
import { useExecutor } from '@graphql-tools/executor-yoga';
import {
  mergeDeep,
  printSchemaWithDirectives,
  type IResolvers,
  type MaybePromise,
  type TypeSource,
} from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import { AsyncDisposableStack } from '@whatwg-node/disposablestack';
import { getProxyExecutor } from './getProxyExecutor.js';
import { handleUnifiedGraphConfig } from './handleUnifiedGraphConfig.js';
import landingPageHtml from './landing-page-html.js';
import type {
  MeshServeConfig,
  MeshServeConfigContext,
  MeshServeContext,
  MeshServePlugin,
  UnifiedGraphConfig,
} from './types.js';
import { useChangingSchema } from './useChangingSchema.js';
import { useCompleteSubscriptionsOnDispose } from './useCompleteSubscriptionsOnDispose.js';
import { useCompleteSubscriptionsOnSchemaChange } from './useCompleteSubscriptionsOnSchemaChange.js';
import { useFetchDebug } from './useFetchDebug.js';
import { useRequestId } from './useRequestId.js';
import { useSubgraphExecuteDebug } from './useSubgraphExecuteDebug.js';

export function createServeRuntime<TContext extends Record<string, any> = Record<string, any>>(
  config: MeshServeConfig<TContext> = {},
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
  let schemaChanged: (schema: GraphQLSchema) => void;
  let contextBuilder: <T>(context: T) => MaybePromise<T>;
  let readinessChecker: () => MaybePromise<boolean>;
  let registryPlugin: MeshPlugin<unknown> = {};
  let subgraphInformationHTMLRenderer: () => MaybePromise<string> = () => '';

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
    if (config.skipValidation) {
      executorPlugin.onValidate = function ({ setResult }) {
        setResult([]);
      };
    }
    unifiedGraphPlugin = executorPlugin;
    readinessChecker = () => {
      const res$ = proxyExecutor({
        document: parse(`query { __typename }`),
      });
      return mapMaybePromise(res$, res => !isAsyncIterable(res) && !!res.data?.__typename);
    };
    schemaInvalidator = () => executorPlugin.invalidateUnifiedGraph();
    subgraphInformationHTMLRenderer = () => {
      const endpoint = config.proxy.endpoint || '#';
      return `<section class="supergraph-information"><h3>Proxy (<a href="${endpoint}">${endpoint}</a>): ${unifiedGraph ? 'Loaded ✅' : 'Not yet ❌'}</h3></section>`;
    };
  } else if ('subgraph' in config) {
    const subgraphInConfig = config.subgraph;
    let getSubschemaConfig$: MaybePromise<boolean>;
    let subschemaConfig: SubschemaConfig;
    function getSubschemaConfig() {
      return mapMaybePromise(
        handleUnifiedGraphConfig(subgraphInConfig, configContext),
        newUnifiedGraph => {
          unifiedGraph = newUnifiedGraph;
          unifiedGraph = restoreExtraDirectives(unifiedGraph);
          subschemaConfig = {
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
            typeDefs: /* GraphQL */ `
              extend type Query {
                _entities(representations: [_Any!]!): [_Entity]!
                _service: _Service!
              }

              scalar _Any
              scalar _Entity
              type _Service {
                sdl: String
              }
            `,
            resolvers: {
              Query: {
                _entities(_root, args, context, info) {
                  if (Array.isArray(args.representations)) {
                    return args.representations.map(representation => {
                      const typeName = representation.__typename;
                      const mergeConfig = subschemaConfig.merge[typeName];
                      const mergeEndpoint = mergeConfig?.entryPoints?.[0] || mergeConfig;
                      const fieldName = mergeConfig?.fieldName;
                      if (fieldName) {
                        const key = mergeConfig?.key?.(representation);
                        if (key) {
                          return mapMaybePromise(
                            batchDelegateToSchema({
                              schema: subschemaConfig,
                              fieldName,
                              key,
                              context,
                              info,
                              dataLoaderOptions: mergeEndpoint?.dataLoaderOptions,
                              valuesFromResults: mergeEndpoint?.valuesFromResults,
                            }),
                            result => mergeDeep([representation, result]),
                          );
                        }
                        const args = mergeConfig?.args?.(representation);
                        if (args) {
                          return mapMaybePromise(
                            delegateToSchema({
                              schema: subschemaConfig,
                              fieldName,
                              args,
                              context,
                              info,
                            }),
                            result => mergeDeep([representation, result]),
                          );
                        }
                      }
                      return args.representations;
                    });
                  }
                  return [];
                },
                _service() {
                  return {
                    sdl() {
                      return printSchemaWithDirectives(newUnifiedGraph);
                    },
                  };
                },
              },
            },
          });
          schemaChanged(unifiedGraph);
          return true;
        },
      );
    }
    unifiedGraphPlugin = {
      // @ts-expect-error PromiseLike is not compatible with Promise
      onRequestParse() {
        if (!subschemaConfig) {
          getSubschemaConfig$ ||= getSubschemaConfig();
          return getSubschemaConfig$;
        }
      },
    };
  } else {
    let unifiedGraphFetcher: UnifiedGraphManagerOptions<unknown>['getUnifiedGraph'];

    if ('supergraph' in config) {
      unifiedGraphFetcher = () => handleUnifiedGraphConfig(config.supergraph, configContext);
    } else if (('hive' in config && config.hive.endpoint) || process.env.HIVE_CDN_ENDPOINT) {
      const cdnEndpoint = 'hive' in config ? config.hive.endpoint : process.env.HIVE_CDN_ENDPOINT;
      const cdnKey = 'hive' in config ? config.hive.key : process.env.HIVE_CDN_KEY;
      if (!cdnKey) {
        throw new Error(
          'You must provide HIVE_CDN_KEY environment variables or `key` in the hive config',
        );
      }
      const fetcher = createSupergraphSDLFetcher({
        endpoint: cdnEndpoint,
        key: cdnKey,
      });
      unifiedGraphFetcher = () => fetcher().then(({ supergraphSdl }) => supergraphSdl);
    } else {
      const errorMessage =
        'You must provide a supergraph schema in the `supergraph` config or point to a supergraph file with `--supergraph` parameter or `HIVE_CDN_ENDPOINT` environment variable or `./supergraph.graphql` file';
      // Falls back to `./supergraph.graphql` by default
      unifiedGraphFetcher = () => {
        try {
          const res$ = handleUnifiedGraphConfig('./supergraph.graphql', configContext);
          if ('catch' in res$ && typeof res$.catch === 'function') {
            return res$.catch(e => {
              if (e.code === 'ENOENT') {
                throw new Error(errorMessage);
              }
              throw e;
            });
          }
          return res$;
        } catch (e) {
          if (e.code === 'ENOENT') {
            throw new Error(errorMessage);
          }
          throw e;
        }
      };
    }

    const hiveToken = 'hive' in config ? config.hive.token : process.env.HIVE_REGISTRY_TOKEN;
    if (hiveToken) {
      registryPlugin = useMeshHive({
        enabled: true,
        ...configContext,
        logger: configContext.logger.child('Hive'),
        ...('hive' in config ? config.hive : {}),
        token: hiveToken,
      });
    }

    const unifiedGraphManager = new UnifiedGraphManager({
      getUnifiedGraph: unifiedGraphFetcher,
      handleUnifiedGraph: opts => {
        // when handleUnifiedGraph is called, we're sure that the schema
        // _really_ changed, we can therefore confidently notify about the schema change
        schemaChanged(opts.unifiedGraph);
        return handleFederationSupergraph(opts);
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
      mapMaybePromise(unifiedGraphManager.getUnifiedGraph(), schema => !!schema);
    schemaInvalidator = () => unifiedGraphManager.invalidateUnifiedGraph();
    contextBuilder = base => unifiedGraphManager.getContext(base);
    disposableStack.use(unifiedGraphManager);
    subgraphInformationHTMLRenderer = async () => {
      const htmlParts: string[] = [];
      let supergraphLoadedPlace = './supergraph.graphql';
      if ('hive' in config && config.hive.endpoint) {
        supergraphLoadedPlace = 'Hive CDN <br>' + config.hive.endpoint;
      } else if ('supergraph' in config) {
        if (typeof config.supergraph === 'function') {
          const fnName = config.supergraph.name || '';
          supergraphLoadedPlace = `a custom loader ${fnName}`;
        } else if (typeof config.supergraph === 'string') {
          supergraphLoadedPlace = config.supergraph;
        }
      }
      let loaded = false;
      let loadError: Error;
      try {
        // TODO: Workaround for the issue
        // When you go to landing page, then GraphiQL, GW stops working
        const schema = await getSchema();
        schemaChanged(schema);
        loaded = true;
      } catch (e) {
        loaded = false;
        loadError = e;
      }
      if (loaded) {
        htmlParts.push(`<h3>Supergraph Status: Loaded ✅</h3>`);
        htmlParts.push(`<p><strong>Source: </strong> <i>${supergraphLoadedPlace}</i></p>`);
        htmlParts.push(`<table>`);
        htmlParts.push(`<tr><th>Subgraph</th><th>Transport</th><th>Location</th></tr>`);
        for (const subgraphName in unifiedGraphManager._transportEntryMap) {
          const transportEntry = unifiedGraphManager._transportEntryMap[subgraphName];
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
        htmlParts.push(`<p><strong>Source: </strong> <i>${supergraphLoadedPlace}</i></p>`);
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
      return new opts.fetchAPI.Response(
        landingPageHtml
          .replace(/__GRAPHIQL_LINK__/g, opts.graphqlEndpoint)
          .replace(/__REQUEST_PATH__/g, opts.url.pathname)
          .replace(/__SUBGRAPH_HTML__/g, await subgraphInformationHTMLRenderer()),
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

  const yoga = createYoga<unknown, MeshServeContext>({
    fetchAPI: config.fetchAPI,
    logging: logger,
    plugins: [
      defaultMeshPlugin,
      unifiedGraphPlugin,
      readinessCheckPlugin,
      registryPlugin,
      useChangingSchema(getSchema, cb => (schemaChanged = cb)),
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

  return makeAsyncDisposable(
    yoga as YogaServerInstance<unknown, MeshServeContext> & {
      invalidateUnifiedGraph(): void;
    },
    () => disposableStack.disposeAsync(),
  );
}
