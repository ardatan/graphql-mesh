import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { DocumentNode } from 'graphql';

// TOOD: Additional resolvers should be part of this options, and loaded by the CLI
export type GetMeshOptions = {
  sources: MeshSource[];
};

export type MeshSource = {
  name: string;
  source: string;
  handler: MeshHandlerLibrary;
  config?: Record<string, any>;
};

export type GraphQLOperation = DocumentNode | string;
export type ExecuteMeshFn<TData = any, TVariables = any> = (
  document: GraphQLOperation,
  variables: TVariables
) => Promise<TData | null | undefined>;
