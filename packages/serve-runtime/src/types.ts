import type {
  BatchingOptions,
  FetchAPI,
  YogaInitialContext,
  YogaMaskedErrorOpts,
  Plugin as YogaPlugin,
  YogaServerOptions,
} from 'graphql-yoga';
import type { Plugin as EnvelopPlugin } from '@envelop/core';
import type { Transport, TransportsOption, UnifiedGraphPlugin } from '@graphql-mesh/fusion-runtime';
import type {
  KeyValueCache,
  Logger,
  MeshFetch,
  MeshPubSub,
  OnFetchHook,
} from '@graphql-mesh/types';
import type { LogLevel } from '@graphql-mesh/utils';
import type { HTTPExecutorOptions } from '@graphql-tools/executor-http';
import type { IResolvers } from '@graphql-tools/utils';
import type { CORSPluginOptions } from '@whatwg-node/server';
import type { UnifiedGraphConfig } from './handleUnifiedGraphConfig.js';

export { UnifiedGraphConfig };

export type MeshServeConfig<TContext extends Record<string, any> = Record<string, any>> =
  | MeshServeConfigWithFusiongraph<TContext>
  | MeshServeConfigWithSupergraph<TContext>
  | MeshServeConfigWithProxy<TContext>;

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

interface MeshServeConfigWithFusiongraph<TContext> extends MeshServeConfigWithoutSource<TContext> {
  /**
   * Path to the GraphQL Fusion unified schema.
   */
  fusiongraph?: UnifiedGraphConfig;
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
   * Implement custom executors for transports.
   */
  transports?: TransportsOption;
}

interface MeshServeConfigWithSupergraph<TContext> extends MeshServeConfigWithoutSource<TContext> {
  /**
   * Path to the Apollo Federation unified schema.
   */
  supergraph?: UnifiedGraphConfig;
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
   * Implement custom executors for transports.
   */
  transports?: TransportsOption;
}

export interface MeshServeConfigWithProxy<TContext> extends MeshServeConfigWithoutSource<TContext> {
  /**
   * HTTP executor to proxy all incoming requests to another HTTP endpoint.
   */
  proxy: HTTPExecutorOptions;

  transport?:
    | Transport<'http'>
    | Promise<Transport<'http'>>
    | (() => Transport<'http'> | Promise<Transport<'http'>>);
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
