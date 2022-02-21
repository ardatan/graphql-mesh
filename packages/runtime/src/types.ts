import {
  KeyValueCache,
  MeshPubSub,
  RawSourceOutput,
  GraphQLOperation,
  MeshHandler,
  MeshTransform,
  YamlConfig,
  Logger,
  MeshMerger,
} from '@graphql-mesh/types';
import { DocumentNode, GraphQLResolveInfo } from 'graphql';
import { IResolvers, Source } from '@graphql-tools/utils';
import { MESH_CONTEXT_SYMBOL } from './constants';
import { MergedTypeConfig } from '@graphql-tools/delegate';
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { MeshInstance } from './get-mesh';
import { envelop } from '@envelop/core';

export type GetMeshOptions = {
  sources: MeshResolvedSource[];
  transforms?: MeshTransform[];
  additionalTypeDefs?: DocumentNode[];
  additionalResolvers?: IResolvers | IResolvers[];
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  merger: MeshMerger;
  logger?: Logger;
  liveQueryInvalidations?: YamlConfig.LiveQueryInvalidation[];
  additionalEnvelopPlugins?: Parameters<typeof envelop>[0]['plugins'];
};

export type MeshResolvedSource<TContext = any> = {
  name: string;
  handler: MeshHandler<TContext>;
  transforms?: MeshTransform[];
  merge?: Record<string, MergedTypeConfig>;
};

export type ExecuteMeshFn<TData = any, TVariables = any, TContext = any, TRootValue = any> = (
  document: GraphQLOperation<TData, TVariables>,
  variables: TVariables,
  context?: TContext,
  rootValue?: TRootValue,
  operationName?: string
) => Promise<TData | null | undefined>;

export type SubscribeMeshFn<TVariables = any, TContext = any, TRootValue = any, TData = any> = (
  document: GraphQLOperation<TData, TVariables>,
  variables?: TVariables,
  context?: TContext,
  rootValue?: TRootValue,
  operationName?: string
) => Promise<TData | null | undefined | AsyncIterableIterator<TData | null | undefined>>;

export type APIContextMethodParams = {
  root?: any;
  args?: any;
  context: any;
  info?: GraphQLResolveInfo;
  selectionSet?: string;
};

export type APIContext = {
  Query: Record<string, (params: APIContextMethodParams) => Promise<any>>;
  Mutation: Record<string, (params: APIContextMethodParams) => Promise<any>>;
  Subscription: Record<string, (params: APIContextMethodParams) => AsyncIterable<any>>;
  rawSource: RawSourceOutput;
};

export type MeshContext = {
  [MESH_CONTEXT_SYMBOL]: true;
  [key: string]: APIContext;
} & { pubsub: MeshPubSub; cache: KeyValueCache; logger: Logger; liveQueryStore: InMemoryLiveQueryStore };

export interface ServeMeshOptions {
  baseDir: string;
  getBuiltMesh: () => Promise<MeshInstance>;
  logger: Logger;
  rawConfig: YamlConfig.Config;
  documents: Source[];
  argsPort?: number;
  graphiqlTitle?: string;
}
