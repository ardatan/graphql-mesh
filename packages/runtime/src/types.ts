import {
  MeshHandlerLibrary,
  YamlConfig,
  KeyValueCache,
  Hooks,
  MergerFn,
  MeshTransformConstructor,
  RawSourceOutput,
} from '@graphql-mesh/types';
import { DocumentNode } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';
import { MESH_CONTEXT_SYMBOL } from './constants';

type ValuesOf<T> = T[keyof T];

export type ResolvedTransform = {
  transformCtor: MeshTransformConstructor<ValuesOf<YamlConfig.Transform>>;
  config: ValuesOf<YamlConfig.Transform>;
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

export type MeshResolvedSource<THandlerConfig = ValuesOf<YamlConfig.Handler>> = {
  name: string;
  handlerLibrary: MeshHandlerLibrary<THandlerConfig>;
  handlerConfig: THandlerConfig;
  transforms?: ResolvedTransform[];
};

export type GraphQLOperation = DocumentNode | string;

export type ExecuteMeshFn<TData = any, TVariables = any> = (
  document: GraphQLOperation,
  variables: TVariables
) => Promise<TData | null | undefined>;

export type Requester<C = any> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R>;

export type APIContext = {
  api: Record<string, Promise<any>>;
  rawSource: RawSourceOutput;
};

export type MeshContext = {
  [MESH_CONTEXT_SYMBOL]: true;
  [key: string]: APIContext;
};
