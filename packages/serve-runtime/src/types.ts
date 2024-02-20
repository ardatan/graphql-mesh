import { DocumentNode, GraphQLSchema } from 'graphql';
import { BatchingOptions, FetchAPI, Plugin, YogaServerOptions } from 'graphql-yoga';
import { GraphiQLOptionsOrFactory } from 'graphql-yoga/typings/plugins/use-graphiql';
import { FusiongraphPlugin, TransportsOption } from '@graphql-mesh/fusion-runtime';
// eslint-disable-next-line import/no-extraneous-dependencies
import { KeyValueCache, Logger, MeshFetch, MeshPubSub, OnFetchHook } from '@graphql-mesh/types';
import { HTTPExecutorOptions } from '@graphql-tools/executor-http';
import { IResolvers } from '@graphql-tools/utils';
import { CORSPluginOptions } from '@whatwg-node/server';

export type UnifiedGraphConfig =
  | GraphQLSchema
  | DocumentNode
  | string
  | (() => UnifiedGraphConfig)
  | Promise<UnifiedGraphConfig>;

export type MeshServeConfig<TContext extends Record<string, any> = Record<string, any>> =
  | MeshServeConfigWithFusiongraph<TContext>
  | MeshServeConfigWithSupergraph<TContext>
  | MeshServeConfigWithHttpEndpoint<TContext>;

export interface MeshServeContext {
  fetch: MeshFetch;
  logger: Logger;
  cwd: string;
  // TODO: change context if these are implemented
  pubsub?: MeshPubSub;
  cache?: KeyValueCache;
  // TODO: should we split context into buildtime and runtime?
  headers?: Record<string, string>;
  /**
   * Runtime context available within WebSocket connections.
   */
  connectionParams?: Record<string, string>;
}

export type MeshServePlugin<
  TPluginContext extends Record<string, any> = Record<string, any>,
  TContext extends Record<string, any> = MeshServeContext,
> = Plugin<Partial<TPluginContext> & TContext> &
  FusiongraphPlugin & { onFetch?: OnFetchHook<Partial<TPluginContext> & TContext> };

interface MeshServeConfigWithFusiongraph<TContext> extends MeshServeConfigWithoutSource<TContext> {
  /**
   * Path to the GraphQL Fusion unified schema.
   *
   * @default ./fusiongraph.graphql
   */
  fusiongraph: UnifiedGraphConfig;
}

interface MeshServeConfigWithSupergraph<TContext> extends MeshServeConfigWithoutSource<TContext> {
  /**
   * Path to the Apollo Federation unified schema.
   *
   * @default ./supergraph.graphql
   */
  supergraph: UnifiedGraphConfig;
}

interface MeshServeConfigWithHttpEndpoint<TContext> extends MeshServeConfigWithoutSource<TContext> {
  http: HTTPExecutorOptions;
}

interface MeshServeConfigWithoutSource<TContext extends Record<string, any>> {
  /**
   * Headers to be sent to the Supergraph Schema endpoint
   */
  schemaHeaders?: Record<string, string>;
  /**
   * Polling interval in milliseconds
   */
  polling?: number;
  /**
   * Plugins
   */
  plugins?(
    context: MeshServeContext & TContext,
  ): MeshServePlugin<unknown, MeshServeContext & TContext>[];
  /**
   * Configuration for CORS
   */
  cors?: CORSPluginOptions<unknown>;
  /**
   * Show GraphiQL
   */
  graphiql?: GraphiQLOptionsOrFactory<unknown>;
  /**
   * Enable and define a limit for [Request Batching](https://github.com/graphql/graphql-over-http/blob/main/rfcs/Batching.md)
   */
  batching?: BatchingOptions;
  /**
   * Imported transports
   */
  transports?: TransportsOption;
  /**
   * WHATWG compatible Fetch implementation
   */
  fetchAPI?: Partial<FetchAPI>;
  /**
   * Logger
   */
  logging?: YogaServerOptions<unknown, MeshServeContext & TContext>['logging'] | Logger;
  /**
   * Additional Resolvers
   */
  additionalResolvers?: IResolvers<unknown, MeshServeContext & TContext>;
  /**
   * Endpoint
   */
  graphqlEndpoint?: string;
  /**
   * Masked errors
   */
  maskedErrors?: YogaServerOptions<MeshServeContext & TContext, unknown>['maskedErrors'];
  // TODO: change context if these are implemented
  cache?: KeyValueCache;
  pubsub?: MeshPubSub;
}
