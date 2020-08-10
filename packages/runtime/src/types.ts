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

export type SelectedFields =
  | {
      [fieldName: string]: SelectedFields;
    }
  | true;

export type ProjectionOptions = {
  /**
   * If you don't provide custom selection, this is the depth of generated selection set by GraphQL Mesh
   * default: 2
   */
  depth?: number;
  /**
   * Provide selection set in form of object similar to MongoDB's projection
   * example: { foo: { bar: true }, baz: true }
   */
  fields?: SelectedFields;
  /**
   * Provide selection set in form of GraphQL SDL
   * example: { foo bar baz }
   */
  selectionSet?: string;
};

export type APIContext = {
  api: Record<string, (args: any, projectionOptions: ProjectionOptions) => Promise<any>>;
  rawSource: RawSourceOutput;
};

export type MeshContext = {
  [MESH_CONTEXT_SYMBOL]: true;
  [key: string]: APIContext;
};

export type ImportFn = (moduleId: string) => Promise<any>;
