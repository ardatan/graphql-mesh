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
import { IResolvers } from '@graphql-tools/utils';
import { MESH_CONTEXT_SYMBOL } from './constants';
import { MergedTypeConfig } from '@graphql-tools/delegate';

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
} & { pubsub: MeshPubSub; cache: KeyValueCache };
