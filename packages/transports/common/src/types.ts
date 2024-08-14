import type { GraphQLSchema } from 'graphql';
import type { Logger, MeshFetch, MeshPubSub } from '@graphql-mesh/types';
import type { Executor, MaybePromise } from '@graphql-tools/utils';

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
  fetch?: MeshFetch;
  pubsub?: MeshPubSub;
  logger?: Logger;
  cwd?: string;
}

export interface TransportGetSubgraphExecutorOptions<
  Options extends Record<string, any> = Record<string, any>,
> extends TransportContext {
  subgraphName: string;
  transportEntry: TransportEntry<Options>;
  getTransportExecutor(transportEntry: TransportEntry): MaybePromise<Executor>;
  subgraph: GraphQLSchema;
}

export type TransportExecutorFactoryGetter = (
  kind: string,
) => MaybePromise<TransportGetSubgraphExecutor>;

export type TransportGetSubgraphExecutor<
  Options extends Record<string, any> = Record<string, any>,
> = (opts: TransportGetSubgraphExecutorOptions<Options>) => Executor | Promise<Executor>;

export type DisposableExecutor = Executor & Partial<Disposable | AsyncDisposable>;
