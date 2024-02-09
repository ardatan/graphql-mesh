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
  | MeshServeConfigWithSourceInput<TContext>
  | MeshServeConfigWithCache<TContext>
  | MeshServeConfigWithPubSub<TContext>;

type MeshServeConfigWithCache<TContext extends Record<string, any>> =
  MeshServeConfigWithSourceInput<TContext & { cache: KeyValueCache }> & {
    cache: KeyValueCache;
  };

type MeshServeConfigWithPubSub<TContext extends Record<string, any>> =
  MeshServeConfigWithSourceInput<TContext & { pubsub: MeshPubSub }> & {
    pubsub: MeshPubSub;
  };

type MeshServeConfigWithSourceInput<TContext> =
  | MeshServeConfigWithFusiongraph<TContext>
  | MeshServeConfigWithSupergraph<TContext>
  | MeshServeConfigWithHttpEndpoint<TContext>;

interface MeshServeConfigWithFusiongraph<TContext> extends MeshServeBaseConfig<TContext> {
  /**
   * Path to the GraphQL Fusion unified schema.
   *
   * @default ./fusiongraph.graphql
   */
  fusiongraph?: UnifiedGraphConfig;
}

interface MeshServeConfigWithSupergraph<TContext> extends MeshServeBaseConfig<TContext> {
  /**
   * Path to the Apollo Federation unified schema.
   *
   * @default ./supergraph.graphql
   */
  supergraph?: UnifiedGraphConfig;
}

interface MeshServeConfigWithHttpEndpoint<TContext> extends MeshServeBaseConfig<TContext> {
  http: HTTPExecutorOptions;
}

interface MeshServeBaseConfig<TContext extends Record<string, any>> {
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
  plugins?(context: MeshServeContext & TContext): MeshServePlugin<MeshServeContext & TContext>[];
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
  logging?: YogaServerOptions<MeshServeContext & TContext, unknown>['logging'] | Logger;
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
}

export type MeshServePlugin<
  TContext extends Record<string, any> = MeshServeContext,
  TPluginContext extends Record<string, any> = {},
> = Plugin<TPluginContext, TContext> & FusiongraphPlugin & { onFetch?: OnFetchHook<TContext> };

export interface MeshServeContext {
  fetch: MeshFetch;
  logger: Logger;
  cwd: string;
  pubsub?: MeshPubSub;
  cache?: KeyValueCache;
}
