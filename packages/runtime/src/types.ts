import {
  MeshHandlerLibrary,
  YamlConfig,
  TransformFn
} from '@graphql-mesh/types';
import { DocumentNode } from 'graphql';
import { IResolvers } from 'graphql-tools-fork';
import { KeyValueCache } from '@graphql-mesh/types';

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
