import {
  BatchingOptions,
  FetchAPI,
  LogLevel,
  YogaInitialContext,
  YogaLogger,
  YogaMaskedErrorOpts,
  Plugin as YogaPlugin,
} from 'graphql-yoga';
import { GraphiQLOptionsOrFactory } from 'graphql-yoga/typings/plugins/use-graphiql';
import { Plugin as EnvelopPlugin } from '@envelop/core';
import { FusiongraphPlugin, TransportsOption } from '@graphql-mesh/fusion-runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import { KeyValueCache, Logger, MeshFetch, MeshPubSub, OnFetchHook } from '@graphql-mesh/types';
import { HTTPExecutorOptions } from '@graphql-tools/executor-http';
import { IResolvers } from '@graphql-tools/utils';
import { CORSPluginOptions } from '@whatwg-node/server';
import { UnifiedGraphConfig } from './handleUnifiedGraphConfig';

export { UnifiedGraphConfig };

export type MeshServeConfig<TContext extends Record<string, any> = Record<string, any>> =
  | MeshServeConfigWithFusiongraph<TContext>
  | MeshServeConfigWithSupergraph<TContext>
  | MeshServeConfigWithProxy<TContext>;

export interface MeshServeConfigContext {
  fetch: MeshFetch;
  logger: Logger;
  cwd: string;
  pubsub?: MeshPubSub;
  cache?: KeyValueCache;
}

export interface MeshServeContext extends MeshServeConfigContext {
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
  FusiongraphPlugin & {
    onFetch?: OnFetchHook<
      Partial<TPluginContext> & YogaInitialContext & MeshServeContext & TContext
    >;
  };

interface MeshServeConfigWithFusiongraph<TContext> extends MeshServeConfigWithoutSource<TContext> {
  /**
   * Path to the GraphQL Fusion unified schema.
   */
  fusiongraph: UnifiedGraphConfig;
  /**
   * Polling interval in milliseconds.
   */
  polling?: number;
  /**
   * Additional GraphQL schema resolvers.
   */
  additionalResolvers?: IResolvers<unknown, MeshServeContext & TContext>;
  /**
   * Implement custom executors for transports.
   */
  transports?: TransportsOption;
}

interface MeshServeConfigWithSupergraph<TContext> extends MeshServeConfigWithoutSource<TContext> {
  /**
   * Path to the Apollo Federation unified schema.
   */
  supergraph: UnifiedGraphConfig;
  /**
   * Polling interval in milliseconds.
   */
  polling?: number;
  /**
   * Additional GraphQL schema resolvers.
   */
  additionalResolvers?: IResolvers<unknown, MeshServeContext & TContext>;
  /**
   * Implement custom executors for transports.
   */
  transports?: TransportsOption;
}

interface MeshServeConfigWithProxy<TContext> extends MeshServeConfigWithoutSource<TContext> {
  /**
   * HTTP executor to proxy all incoming requests to another HTTP endpoint.
   */
  proxy: HTTPExecutorOptions;
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
  graphiql?: GraphiQLOptionsOrFactory<unknown>;
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
  logging?: boolean | YogaLogger | LogLevel | undefined;
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
}
