import { MeshHandlerLibrary, TransformFn } from '@graphql-mesh/types';
import { DocumentNode } from 'graphql';
import { IResolvers } from 'graphql-tools-fork';
import { KeyValueCache } from '@graphql-mesh/types';

export type GetMeshOptions = {
  sources: MeshResolvedSource[];
  transformations?: Transformation[];
  additionalResolvers?: IResolvers;
  cache?: KeyValueCache;
};

export type Transformation<> = {
  transformer: TransformFn;
  config: any;
};

export type MeshResolvedSource = {
  name: string;
  source: string;
  handler: MeshHandlerLibrary;
  config?: Record<string, any>;
  context?: Record<string, any>;
  transformations?: Transformation[];
};

export type GraphQLOperation = DocumentNode | string;

export type ExecuteMeshFn<TData = any, TVariables = any> = (
  document: GraphQLOperation,
  variables: TVariables
) => Promise<TData | null | undefined>;
