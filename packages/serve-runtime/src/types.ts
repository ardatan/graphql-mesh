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
  | MeshServeConfigWithSupergraph<TContext>
  | MeshServeConfigWithSubgraph<TContext>
  | MeshServeConfigWithProxy<TContext>
  | MeshServeConfigWithHive<TContext>;

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

export interface MeshServeConfigWithSupergraph<TContext>
  extends MeshServeConfigWithSchema<TContext> {
  /**
   * Path to the Federation Supergraph.
   */
  supergraph?: UnifiedGraphConfig;
}

export interface MeshServeConfigWithHive<TContext> extends MeshServeConfigWithSchema<TContext> {
  /**
   * Integration options with GraphQL Hive.
   */
  hive: Partial<YamlConfig.HivePlugin> & HiveCDNOptions;
}

export interface MeshServeConfigWithSubgraph<TContext>
  extends MeshServeConfigWithSchema<TContext>,
    TransportRelatedConfig {
  /**
   * Path to the subgraph schema.
   */
  subgraph: UnifiedGraphConfig;
}

interface HiveCDNOptions {
  /**
   * The endpoint of the CDN you obtained from GraphQL Hive.
   *
   * You can provide an environment variable (HIVE_CDN_ENDPOINT) to set this value.
   *
   * @example https://cdn.graphql-hive.com/artifacts/v1/AAA-AAA-AAA/supergraph
   *
   * @default process.env.HIVE_CDN_ENDPOINT
   */
  endpoint?: string;
  /**
   * The key you obtained from GraphQL Hive for the CDN.
   *
   * You can provide an environment variable (HIVE_CDN_KEY) to set this value.
   *
   * @default process.env.HIVE_CDN_KEY
   */
  key?: string;
}

interface TransportRelatedConfig {
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
}

interface MeshServeConfigWithSchema<TContext>
  extends MeshServeConfigWithoutSource<TContext>,
    TransportRelatedConfig {
  /**
   * Polling interval in milliseconds.
   */
  polling?: number;
  /**
   * Additional GraphQL schema resolvers.
   */
  additionalResolvers?:
    | IResolvers<unknown, MeshServeContext & TContext>
    | IResolvers<unknown, MeshServeContext>[];
  /**
   * Current working directory.
   */
  cwd?: string;
}

export interface MeshServeConfigWithProxy<TContext>
  extends MeshServeConfigWithoutSource<TContext>,
    TransportRelatedConfig {
  /**
   * HTTP executor to proxy all incoming requests to another HTTP endpoint.
   */
  proxy: HTTPExecutorOptions;
  /**
   * Integration options with GraphQL Hive.
   */
  hive?: Partial<YamlConfig.HivePlugin> & HiveCDNOptions;
  /**
   * Polling interval in milliseconds.
   */
  polling?: number;
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

interface MeshServeConfigWithoutSource<TContext extends Record<string, any>> {
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
}
