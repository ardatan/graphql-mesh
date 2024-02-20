import { DocumentNode, GraphQLSchema } from 'graphql';
import {
  BatchingOptions,
  FetchAPI,
  YogaInitialContext,
  Plugin as YogaPlugin,
  YogaServerOptions,
} from 'graphql-yoga';
import { GraphiQLOptionsOrFactory } from 'graphql-yoga/typings/plugins/use-graphiql';
import { Plugin as EnvelopPlugin } from '@envelop/core';
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
  | Promise<UnifiedGraphConfig>
  | (() => UnifiedGraphConfig | Promise<UnifiedGraphConfig>);

export type MeshServeConfig<TContext extends Record<string, any> = Record<string, any>> =
  | MeshServeConfigWithFusiongraph<TContext>
  | MeshServeConfigWithSupergraph<TContext>
  | MeshServeConfigWithHttpEndpoint<TContext>;

export interface MeshServeConfigContext {
  fetch: MeshFetch;
  logger: Logger;
  cwd: string;
  // TODO: change context if these are implemented
  pubsub?: MeshPubSub;
  cache?: KeyValueCache;
}

export interface MeshServeContext extends MeshServeConfigContext {
  // TODO: should we split context into buildtime and runtime?
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
    context: MeshServeConfigContext,
  ): // TODO: we want to accept yoga and envelop and mesh plugins with different contexts in strict environments. more elegant solution?
  (
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
