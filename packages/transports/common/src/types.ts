import type { GraphQLSchema } from 'graphql';
import type { Logger, MeshFetch, MeshPubSub } from '@graphql-mesh/types';
import type { Executor } from '@graphql-tools/utils';

export interface Transport<Kind extends string = string, Options = Record<string, any>> {
  getSubgraphExecutor: TransportGetSubgraphExecutor<Kind, Options>;
}

export interface TransportEntry<Kind extends string = string, Options = Record<string, any>> {
  kind: Kind;
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
  Kind extends string = string,
  Options = Record<string, any>,
> extends TransportContext {
  subgraphName: string;
  transportEntry: TransportEntry<Kind, Options>;
  subgraph: GraphQLSchema;
}

export type TransportGetSubgraphExecutor<
  Kind extends string = string,
  Options = Record<string, any>,
> = (opts: TransportGetSubgraphExecutorOptions<Kind, Options>) => Executor | Promise<Executor>;

export type DisposableExecutor = Executor & Partial<Disposable | AsyncDisposable>;
