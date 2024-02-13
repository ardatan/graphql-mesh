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

export type MeshServeConfig<TContext extends Record<string, any> = {}> =
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
}

export type MeshServePlugin<
  TPluginContext extends Record<string, any> = any,
  TContext extends Record<string, any> = MeshServeContext,
> = Plugin<TPluginContext, TContext> & FusiongraphPlugin & { onFetch?: OnFetchHook<TContext> };

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
  ): MeshServePlugin<any, MeshServeContext & TContext>[];
  /**
   * Configuration for CORS
   */
  cors?: CORSPluginOptions<MeshServeContext & TContext>;
  /**
   * Show GraphiQL
   */
  graphiql?: GraphiQLOptionsOrFactory<MeshServeContext & TContext>;
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
  logging?: YogaServerOptions<MeshServeContext & TContext, any>['logging'] | Logger;
  /**
   * Additional Resolvers
   */
  additionalResolvers?: IResolvers<any, MeshServeContext & TContext>;
  /**
   * Endpoint
   */
  graphqlEndpoint?: string;
  /**
   * Masked errors
   */
  maskedErrors?: YogaServerOptions<MeshServeContext & TContext, any>['maskedErrors'];
  // TODO: change context if these are implemented
  cache?: KeyValueCache;
  pubsub?: MeshPubSub;
}
