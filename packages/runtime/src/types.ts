import { MeshHandlerLibrary, OutputTransformationFn, SchemaTransformationFn } from '@graphql-mesh/types';
import { DocumentNode } from 'graphql';
import { IResolvers } from 'graphql-tools-fork';


// TOOD: Additional resolvers should be part of this options, and loaded by the CLI
export type GetMeshOptions = {
  sources: MeshSource[];
  transformations?: Transformation<OutputTransformationFn>[];
  additionalResolvers?: IResolvers;
};

export type Transformation<T = OutputTransformationFn | SchemaTransformationFn> = {
  transformer: T;
  config: any;
}

export type MeshSource = {
  name: string;
  source: string;
  handler: MeshHandlerLibrary;
  config?: Record<string, any>;
  context?: Record<string, any>;
  transformations?: Transformation<SchemaTransformationFn>[];
};

export type GraphQLOperation = DocumentNode | string;
export type ExecuteMeshFn<TData = any, TVariables = any> = (
  document: GraphQLOperation,
  variables: TVariables
) => Promise<TData | null | undefined>;
