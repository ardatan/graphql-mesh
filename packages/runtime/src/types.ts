import {
  MeshHandlerLibrary,
  YamlConfig,
  KeyValueCache,
  Hooks,
  MergerFn,
  MeshTransformLibrary,
  RawSourceOutput,
} from '@graphql-mesh/types';
import { DocumentNode } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';
import { MESH_CONTEXT_SYMBOL } from './constants';

export type ResolvedTransform<TTransformName extends keyof YamlConfig.Transform = keyof YamlConfig.Transform> = {
  transformLibrary: MeshTransformLibrary<YamlConfig.Transform[TTransformName]>;
  config: YamlConfig.Transform[TTransformName];
};

export type GetMeshOptions = {
  sources: MeshResolvedSource[];
  transforms?: ResolvedTransform[];
  additionalTypeDefs?: DocumentNode[];
  additionalResolvers?: IResolvers;
  cache?: KeyValueCache;
  hooks?: Hooks;
  ignoreAdditionalResolvers?: boolean;
  merger: MergerFn;
};

export type MeshResolvedSource<THandlerName extends keyof YamlConfig.Handler = keyof YamlConfig.Handler> = {
  name: string;
  handlerLibrary: MeshHandlerLibrary<YamlConfig.Handler[THandlerName]>;
  handlerConfig: YamlConfig.Handler[THandlerName];
  transforms?: ResolvedTransform[];
};

export type GraphQLOperation = DocumentNode | string;

export type ExecuteMeshFn<TData = any, TVariables = any> = (
  document: GraphQLOperation,
  variables: TVariables
) => Promise<TData | null | undefined>;

export type SubscribeMeshFn<TData = any, TVariables = any> = (
  document: GraphQLOperation,
  variables: TVariables
) => Promise<TData | null | undefined | AsyncIterableIterator<TData | null | undefined>>;

export type Requester<C = any> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R>;

export type APIContext = {
  api: Record<string, Promise<any>>;
  rawSource: RawSourceOutput;
};

export type MeshContext = {
  [MESH_CONTEXT_SYMBOL]: true;
  [key: string]: APIContext;
};
