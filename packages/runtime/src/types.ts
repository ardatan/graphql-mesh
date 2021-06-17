import {
  KeyValueCache,
  MeshPubSub,
  MergerFn,
  RawSourceOutput,
  GraphQLOperation,
  MeshHandler,
  MeshTransform,
  YamlConfig,
} from '@graphql-mesh/types';
import { DocumentNode } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';
import { MESH_CONTEXT_SYMBOL } from './constants';
import { MergedTypeConfig } from '@graphql-tools/delegate';

export type GetMeshOptions = {
  sources: MeshResolvedSource[];
  transforms?: MeshTransform[];
  additionalTypeDefs?: DocumentNode[];
  additionalResolvers?: IResolvers;
  cache: KeyValueCache;
  pubsub: MeshPubSub;
  ignoreAdditionalResolvers?: boolean;
  merger: MergerFn;
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
} & { pubsub: MeshPubSub; cache: KeyValueCache };
