import { MeshHandlerLibrary, YamlConfig, TransformFn, KeyValueCache, Hooks, MergerFn } from '@graphql-mesh/types';
import { DocumentNode, GraphQLSchema } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';
import { MESH_CONTEXT_SYMBOL } from './constants';

type ValuesOf<T> = T[keyof T];

export type ResolvedTransform = {
  transformFn: TransformFn;
  config: ValuesOf<YamlConfig.Transform>;
};

export type GetMeshOptions = {
  sources: MeshResolvedSource[];
  transforms?: ResolvedTransform[];
  additionalResolvers?: IResolvers;
  cache?: KeyValueCache;
  hooks?: Hooks;
  ignoreAdditionalResolvers?: boolean;
  merger: MergerFn;
};

export type MeshResolvedSource = {
  name: string;
  handlerLibrary: MeshHandlerLibrary;
  handlerConfig: ValuesOf<YamlConfig.Handler>;
  context?: Record<string, any>;
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
  config: any;
  schema: GraphQLSchema;
};

export type MeshContext = {
  [MESH_CONTEXT_SYMBOL]: true;
  [key: string]: APIContext;
};
