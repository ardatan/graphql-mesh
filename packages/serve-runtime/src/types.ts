import type { DocumentNode, GraphQLSchema } from 'graphql';
import type {
  BatchingOptions,
  FetchAPI,
  YogaInitialContext,
  YogaMaskedErrorOpts,
  Plugin as YogaPlugin,
  YogaServerOptions,
} from 'graphql-yoga';
import type { Plugin as EnvelopPlugin } from '@envelop/core';
import type { Transports, UnifiedGraphPlugin } from '@graphql-mesh/fusion-runtime';
import type { TransportEntry } from '@graphql-mesh/transport-common';
import type {
  KeyValueCache,
  Logger,
  MeshFetch,
  MeshPubSub,
  OnFetchHook,
  YamlConfig,
} from '@graphql-mesh/types';
import type { LogLevel } from '@graphql-mesh/utils';
import type { HTTPExecutorOptions } from '@graphql-tools/executor-http';
import type { IResolvers } from '@graphql-tools/utils';
import type { UnifiedGraphConfig } from './handleUnifiedGraphConfig.js';

export type { UnifiedGraphConfig };

export type TransportEntryAdditions = {
  [subgraph: '*' | string]: Partial<TransportEntry>;
};

export type MeshServeConfig<TContext extends Record<string, any> = Record<string, any>> =
  | MeshServeConfigSupergraph<TContext>
  | MeshServeConfigSubgraph<TContext>
  | MeshServeConfigProxy<TContext>;

export interface MeshServeConfigContext {
  /**
   * WHATWG compatible Fetch implementation.
   */
  fetch: MeshFetch;
  /**
   * The logger to use throught Mesh and it's plugins.
   */
  logger: Logger;
  /**
   * Current working directory.
   */
  cwd: string;
  /**
   * Event bus for pub/sub.
   */
  pubsub?: MeshPubSub;
  /**
   * Cache Storage
   */
  cache?: KeyValueCache;
}

export interface MeshServeContext extends MeshServeConfigContext, YogaInitialContext {
  /**
   * Environment agnostic HTTP headers provided with the request.
   */
  headers: Record<string, string>;
  /**
   * Runtime context available within WebSocket connections.
   */
  connectionParams: Record<string, string>;
}

export type MeshServePlugin<
  TPluginContext extends Record<string, any> = Record<string, any>,
  TContext extends Record<string, any> = Record<string, any>,
> = YogaPlugin<Partial<TPluginContext> & MeshServeContext & TContext> &
  UnifiedGraphPlugin<Partial<TPluginContext> & MeshServeContext & TContext> & {
    onFetch?: OnFetchHook<Partial<TPluginContext> & MeshServeContext & TContext>;
  } & Partial<Disposable | AsyncDisposable>;

export interface MeshServeConfigSupergraph<
  TContext extends Record<string, any> = Record<string, any>,
> extends MeshServeConfigSchemaBase<TContext> {
  /**
   * SDL, path or an URL to the Federation Supergraph schema.
   *
   * Alternatively, CDN options for pulling a remote Federation Supergraph.
   */
  supergraph:
    | UnifiedGraphConfig
    | MeshServeHiveCDNOptions
    | MeshServeGraphOSManagedFederationOptions;
  /**
   * GraphQL schema polling interval in milliseconds when the {@link supergraph} is an URL.
   */
  pollingInterval?: number;
}

export interface MeshServeConfigSubgraph<TContext extends Record<string, any> = Record<string, any>>
  extends MeshServeConfigSchemaBase<TContext> {
  /**
   * SDL, path or an URL to the Federation Subgraph schema.
   */
  subgraph: UnifiedGraphConfig;
}

interface MeshServeConfigSchemaBase<TContext> extends MeshServeConfigBase<TContext> {
  /**
   * Additional GraphQL schema resolvers.
   */
  additionalResolvers?:
    | (IResolvers<unknown, MeshServeContext & TContext> | IResolvers<unknown, MeshServeContext>)
    | (IResolvers<unknown, MeshServeContext & TContext> | IResolvers<unknown, MeshServeContext>)[];
}

export interface MeshServeConfigProxy<TContext extends Record<string, any> = Record<string, any>>
  extends MeshServeConfigBase<TContext> {
  /**
   * HTTP executor to proxy all incoming requests to another HTTP endpoint.
   */
  proxy: HTTPExecutorOptions & { endpoint: string };
  /**
   * SDL, path or an URL to the GraphQL schema.
   *
   * Alternatively, CDN options for pulling a remote GraphQL schema.
   */
  schema?: GraphQLSchema | DocumentNode | string | MeshServeHiveCDNOptions;
  /**
   * GraphQL schema polling interval in milliseconds.
   */
  pollingInterval?: number;
  /**
   * Disable GraphQL validation on the gateway
   *
   * By default, the gateway will validate the query against the schema before sending it to the executor.
   * This is recommended to be enabled, but can be disabled for performance reasons.
   *
   * @default false
   */
  skipValidation?: boolean;
}

export interface MeshServeHiveCDNOptions {
  type: 'hive';
  /**
   * GraphQL Hive CDN endpoint URL.
   */
  endpoint: string;
  /**
   * GraphQL Hive CDN access key.
   */
  key: string;
}

export interface MeshServeHiveReportingOptions
  extends Omit<YamlConfig.HivePlugin, 'experimental__persistedDocuments'> {
  type: 'hive';
  /** GraphQL Hive registry access token. */
  token: string;
}

export interface MeshServeGraphOSOptions {
  type: 'graphos';
  /**
   * The graph ref of the managed federation graph.
   * It is composed of the graph ID and the variant (`<YOUR_GRAPH_ID>@<VARIANT>`).
   *
   * You can find a a graph's ref at the top of its Schema Reference page in Apollo Studio.
   */
  graphRef: string;
  /**
   * The API key to use to authenticate with the managed federation up link.
   * It needs at least the `service:read` permission.
   *
   * [Learn how to create an API key](https://www.apollographql.com/docs/federation/v1/managed-federation/setup#4-connect-the-gateway-to-studio)
   */
  apiKey: string;
}

export interface MeshServeGraphOSManagedFederationOptions extends MeshServeGraphOSOptions {
  /**
   * Maximum number of retries to attempt when fetching the schema from the managed federation up link.
   */
  maxRetries?: number;
  /**
   * Minimum delay in seconds
   */
  minDelaySeconds?: number;
  /**
   * Delay of seconds on retries
   */
  retryDelaySeconds?: number;
  /**
   * The URL of the managed federation up link. When retrying after a failure, you should cycle through the default up links using this option.
   *
   * Uplinks are available in `DEFAULT_UPLINKS` constant.
   *
   * This options can also be defined using the `APOLLO_SCHEMA_CONFIG_DELIVERY_ENDPOINT` environment variable.
   * It should be a comma separated list of up links, but only the first one will be used.
   *
   * Default: 'https://uplink.api.apollographql.com/' (Apollo's managed federation up link on GCP)
   *
   * Alternative: 'https://aws.uplink.api.apollographql.com/' (Apollo's managed federation up link on AWS)
   */
  upLink?: string;
}

export interface MeshServeGraphOSReportingOptions extends MeshServeGraphOSOptions {
  /**
   * Usage report endpoint
   *
   * Defaults to GraphOS endpoint (https://usage-reporting.api.apollographql.com/api/ingress/traces)
   */
  endpoint?: string;
}

/**
 * Use Hive's CDN for persisted documents.
 *
 * [See more.](https://the-guild.dev/graphql/hive/docs/features/app-deployments#persisted-documents-on-graphql-server-and-gateway)
 * */
export interface MeshServeHivePersistedDocumentsOptions {
  type: 'hive';
  /**
   * GraphQL Hive persisted documents CDN endpoint URL.
   */
  endpoint: string;
  /**
   * GraphQL Hive persisted documents CDN access token.
   */
  token: string;
}

interface MeshServeConfigBase<TContext extends Record<string, any>> {
  /** Usage reporting options. */
  reporting?: MeshServeHiveReportingOptions | MeshServeGraphOSReportingOptions;
  /** Persisted documents options. */
  persistedDocuments?: MeshServeHivePersistedDocumentsOptions;
  /**
   * A map, or factory function, of transport kinds to their implementations.
   *
   * @example Providing a module exporting a transport.
   *
   * ```ts
   * import { defineConfig } from '@graphql-mesh/serve-cli';
   *
   * export const serveConfig = defineConfig({
   *   transports: {
   *     http: import('@graphql-mesh/transport-http'),
   *   },
   * });
   * ```
   */
  transports?: Transports;
  /**
   * Configure Transport options for each subgraph.
   *
   * @example Adding subscriptions support for Federation v2 subgraphs.
   *
   * ```ts
   * import { defineConfig } from '@graphql-mesh/serve-cli';
   *
   * export const serveConfig = defineConfig({
   *   transportEntries: {
   *     '*': {
   *       http: {
   *          options: {
   *            subscriptions: {
   *              ws: {
   *                endpoint: '/subscriptions',
   *              },
   *          },
   *         },
   *       },
   *     },
   *   },
   * });
   * ```
   */
  transportEntries?: TransportEntryAdditions;
  /**
   * Mesh plugins that are compatible with GraphQL Yoga, envelop and Mesh.
   */
  plugins?(context: MeshServeConfigContext): (
    | EnvelopPlugin
    | EnvelopPlugin<MeshServeContext>
    | EnvelopPlugin<MeshServeContext & TContext>
    //
    | YogaPlugin
    | YogaPlugin<MeshServeContext>
    | YogaPlugin<MeshServeContext & TContext>
    //
    | MeshServePlugin
    | MeshServePlugin<unknown, MeshServeContext>
    | MeshServePlugin<unknown, MeshServeContext & TContext>
  )[];
  /**
   * Enable, disable or configure CORS.
   */
  cors?: YogaServerOptions<unknown, MeshServeContext & TContext>['cors'];
  /**
   * Show, hide or configure GraphiQL.
   */
  graphiql?: YogaServerOptions<unknown, MeshServeContext & TContext>['graphiql'];
  /**
   * Whether the landing page should be shown.
   */
  landingPage?: boolean;
  /**
   * Enable and define a limit for [Request Batching](https://github.com/graphql/graphql-over-http/blob/main/rfcs/Batching.md).
   */
  batching?: BatchingOptions;
  /**
   * WHATWG compatible Fetch implementation.
   */
  fetchAPI?: Partial<
    Omit<FetchAPI, 'fetch'> & {
      fetch?: MeshFetch;
    }
  >;
  /**
   * Enable, disable or implement a custom logger for logging.
   *
   * @default true
   */
  logging?: boolean | Logger | LogLevel | undefined;
  /**
   * Endpoint of the GraphQL API.
   */
  graphqlEndpoint?: string;
  /**
   * Configure error masking for more control over the exposed errors.
   *
   * Throwing `EnvelopError` or `GraphQLError`s within your GraphQL resolvers exposes the full error to the client through a well-formatted GraphQL response.
   *
   * @see https://the-guild.dev/graphql/yoga-server/docs/features/error-masking
   *
   * @default true
   */
  maskedErrors?: boolean | Partial<YogaMaskedErrorOpts>;
  cache?: KeyValueCache;
  pubsub?: MeshPubSub;
  /**
   * Health check endpoint
   */
  healthCheckEndpoint?: string;
  /**
   * Readiness check endpoint
   */
  readinessCheckEndpoint?: string;
  /**
   * Working directory to run Mesh Serve with.
   */
  cwd?: string;
}
