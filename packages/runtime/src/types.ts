import {
  KeyValueCache,
  MeshPubSub,
  GraphQLOperation,
  MeshHandler,
  MeshTransform,
  YamlConfig,
  Logger,
  MeshMerger,
} from '@graphql-mesh/types';
import { DocumentNode, ExecutionResult } from 'graphql';
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
  additionalEnvelopPlugins?: Parameters<typeof envelop>[0]['plugins'];
  documents?: Source[];
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
) => Promise<ExecutionResult<TData>>;

export type SubscribeMeshFn<TVariables = any, TContext = any, TRootValue = any, TData = any> = (
  document: GraphQLOperation<TData, TVariables>,
  variables?: TVariables,
  context?: TContext,
  rootValue?: TRootValue,
  operationName?: string
) => Promise<ExecutionResult<TData> | AsyncIterable<ExecutionResult<TData>>>;

export type MeshContext = {
  [MESH_CONTEXT_SYMBOL]: true;
} & { pubsub: MeshPubSub; cache: KeyValueCache; logger: Logger; liveQueryStore: InMemoryLiveQueryStore };

export interface ServeMeshOptions {
  baseDir: string;
  getBuiltMesh: () => Promise<MeshInstance>;
  logger: Logger;
  rawConfig: YamlConfig.Config;
  argsPort?: number;
  playgroundTitle?: string;
}
