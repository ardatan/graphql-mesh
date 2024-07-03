import type {
  BatchingOptions,
  FetchAPI,
  YogaInitialContext,
  YogaMaskedErrorOpts,
  Plugin as YogaPlugin,
  YogaServerOptions,
} from 'graphql-yoga';
import type { Plugin as EnvelopPlugin } from '@envelop/core';
import type { createSupergraphSDLFetcher } from '@graphql-hive/client';
import type { TransportsConfig, UnifiedGraphPlugin } from '@graphql-mesh/fusion-runtime';
import type { TransportGetSubgraphExecutor } from '@graphql-mesh/transport-common';
import type { HTTPTransportOptions } from '@graphql-mesh/transport-http';
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
import type { IResolvers, MaybePromise } from '@graphql-tools/utils';
import type { CORSPluginOptions } from '@whatwg-node/server';
import type { UnifiedGraphConfig } from './handleUnifiedGraphConfig.js';

export type { UnifiedGraphConfig };

export type MeshServeConfig<TContext extends Record<string, any> = Record<string, any>> =
  | MeshServeConfigWithSupergraph<TContext>
  | MeshServeConfigWithProxy<TContext>
  | MeshServeConfigWithHive<TContext>;

export interface MeshServeConfigContext {
  /**
   * WHATWG compatible Fetch implementation.
   */
  fetch: MeshFetch;
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
  UnifiedGraphPlugin & {
    onFetch?: OnFetchHook<Partial<TPluginContext> & MeshServeContext & TContext>;
  } & Partial<Disposable | AsyncDisposable>;

interface MeshServeConfigWithSupergraph<TContext> extends MeshServeConfigForSupergraph<TContext> {
  /**
   * Path to the Apollo Federation unified schema.
   */
  supergraph?: UnifiedGraphConfig;
}

interface MeshServeConfigWithHive<TContext> extends MeshServeConfigForSupergraph<TContext> {
  /**
   * Integration options with GraphQL Hive.
   */
  hive: YamlConfig.HivePlugin & HiveCDNOptions;
}

type HiveCDNFetcherOptions = Parameters<typeof createSupergraphSDLFetcher>[0];

interface HiveCDNOptions extends Partial<HiveCDNFetcherOptions> {
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

interface MeshServeConfigForSupergraph<TContext> extends MeshServeConfigWithoutSource<TContext> {
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
   * Provide custom options or executors for transports.
   *
   * ```ts
   * ```
   */
  transports?: TransportsConfig;
  /**
   * Current working directory.
   */
  cwd?: string;
}

export interface MeshServeConfigWithProxy<TContext> extends MeshServeConfigWithoutSource<TContext> {
  /**
   * HTTP executor to proxy all incoming requests to another HTTP endpoint.
   */
  proxy: HTTPExecutorOptions;

  transport?:
    | MaybePromise<
        HTTPTransportOptions & {
          getSubgraphExecutor?: TransportGetSubgraphExecutor<'http', HTTPTransportOptions>;
        }
      >
    | (() => MaybePromise<
        HTTPTransportOptions & {
          getSubgraphExecutor?: TransportGetSubgraphExecutor<'http', HTTPTransportOptions>;
        }
      >);

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
  cors?: CORSPluginOptions<unknown>;
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
  fetchAPI?: Partial<FetchAPI>;
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
