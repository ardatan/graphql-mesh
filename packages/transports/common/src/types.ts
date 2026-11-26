import type { GraphQLError, GraphQLSchema } from 'graphql';
import type { Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import type { KeyValueCache, MeshFetch } from '@graphql-mesh/types';
import type { Executor } from '@graphql-tools/utils';
import type { MaybePromise } from '@whatwg-node/promise-helpers';

export interface Transport<Options extends Record<string, any> = Record<string, any>> {
  getSubgraphExecutor: TransportGetSubgraphExecutor<Options>;
}

export interface TransportEntry<Options extends Record<string, any> = Record<string, any>> {
  kind: string;
  subgraph: string;
  location?: string;
  headers?: [string, string][];
  options?: Options;
}

export interface TransportContext {
  log: Logger;
  /** The fetch API to use. */
  fetch?: MeshFetch;
  /** Will be empty when run on serverless. */
  cwd?: string;
  pubsub?: PubSub;
  cache?: KeyValueCache;
}

export interface TransportGetSubgraphExecutorOptions<
  Options extends Record<string, any> = Record<string, any>,
> extends TransportContext {
  subgraphName: string;
  transportEntry: TransportEntry<Options>;
  getTransportExecutor(transportEntry: TransportEntry): MaybePromise<Executor>;
  subgraph: GraphQLSchema;
  getDisposeReason?: () => GraphQLError | undefined;
}

export type TransportExecutorFactoryGetter = (
  kind: string,
) => MaybePromise<TransportGetSubgraphExecutor>;

export type TransportGetSubgraphExecutor<
  Options extends Record<string, any> = Record<string, any>,
> = (opts: TransportGetSubgraphExecutorOptions<Options>) => MaybePromise<Executor>;

export type DisposableExecutor = Executor & Partial<Disposable | AsyncDisposable>;

export type { UpstreamErrorExtensions } from '@graphql-tools/executor-common';
export { type Executor };
