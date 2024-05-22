import { DocumentNode, ExecutionResult } from 'graphql';
import { Plugin } from '@envelop/core';
import {
  GraphQLOperation,
  KeyValueCache,
  Logger,
  MeshFetch,
  MeshHandler,
  MeshMerger,
  MeshPubSub,
  MeshTransform,
  YamlConfig,
} from '@graphql-mesh/types';
import { TerminateHandler } from '@graphql-mesh/utils';
import { IResolvers, Source } from '@graphql-tools/utils';
import { MESH_CONTEXT_SYMBOL } from './constants.js';
import { MeshInstance } from './get-mesh.js';

export type GetMeshOptions = {
  sources: MeshResolvedSource[];
  transforms?: MeshTransform[];
  additionalTypeDefs?: DocumentNode[];
  additionalResolvers?: IResolvers | IResolvers[];
  cache: KeyValueCache;
  pubsub?: MeshPubSub;
  merger: MeshMerger;
  logger?: Logger;
  additionalEnvelopPlugins?: Plugin[];
  documents?: Source[];
  fetchFn?: MeshFetch;
};

export type MeshResolvedSource = {
  name: string;
  handler: MeshHandler;
  transforms?: MeshTransform[];
};

export type ExecuteMeshFn<TData = any, TVariables = any, TContext = any, TRootValue = any> = (
  document: GraphQLOperation<TData, TVariables>,
  variables: TVariables,
  context?: TContext,
  rootValue?: TRootValue,
  operationName?: string,
) => Promise<ExecutionResult<TData>>;

export type SubscribeMeshFn<TVariables = any, TContext = any, TRootValue = any, TData = any> = (
  document: GraphQLOperation<TData, TVariables>,
  variables?: TVariables,
  context?: TContext,
  rootValue?: TRootValue,
  operationName?: string,
) => Promise<ExecutionResult<TData> | AsyncIterable<ExecutionResult<TData>>>;

export type MeshContext = {
  [MESH_CONTEXT_SYMBOL]: true;
} & { pubsub: MeshPubSub; cache: KeyValueCache; logger: Logger; fetch: MeshFetch };

export interface ServeMeshOptions {
  baseDir: string;
  getBuiltMesh: () => Promise<MeshInstance>;
  logger: Logger;
  rawServeConfig: YamlConfig.Config['serve'];
  argsPort?: number;
  playgroundTitle?: string;
  registerTerminateHandler(handler: TerminateHandler): void;
}

export type MeshExecutor = <TData, TVariables, TContext, TRootValue>(
  documentOrSDL: GraphQLOperation<TData, TVariables>,
  variables?: TVariables,
  context?: TContext,
  rootValue?: TRootValue,
  operationName?: string,
) => Promise<TData | AsyncIterable<TData>>;
