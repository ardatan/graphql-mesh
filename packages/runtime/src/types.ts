import {
  MeshHandlerLibrary,
  YamlConfig,
  TransformFn
} from '@graphql-mesh/types';
import { DocumentNode, GraphQLSchema } from 'graphql';
import { IResolvers } from 'graphql-tools-fork';
import { KeyValueCache, Hooks } from '@graphql-mesh/types';

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

export type Requester<C = {}> = <R, V>(
  doc: DocumentNode,
  vars?: V,
  options?: C
) => Promise<R>;

export type RawSourceOutput = {
  name: string;
  // TOOD: Remove globalContextBuilder and use hooks for that
  globalContextBuilder: null | ((initialContextValue?: any) => Promise<any>);
  sdk: Record<string, any>;
  schema: GraphQLSchema;
  context: Record<string, any>;
  contextVariables: string[];
  handler: MeshHandlerLibrary;
};
