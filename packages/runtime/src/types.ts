import {
  MeshHandlerLibrary,
  YamlConfig,
  TransformFn
} from '@graphql-mesh/types';
import { DocumentNode } from 'graphql';
import { IResolvers } from 'graphql-tools-fork';

export type GetMeshOptions = {
  sources: MeshResolvedSource[];
  transformations?: Transformation[];
  additionalResolvers?: IResolvers;
};

export type Transformation<> = {
  transformer: TransformFn;
  config: any;
};

export type MeshResolvedSource = {
  name: string;
  handler: MeshHandlerLibrary;
  handlerSourceObject: YamlConfig.Source['handler'];
  context?: Record<string, any>;
  transformations?: Transformation[];
};

export type GraphQLOperation = DocumentNode | string;

export type ExecuteMeshFn<TData = any, TVariables = any> = (
  document: GraphQLOperation,
  variables: TVariables
) => Promise<TData | null | undefined>;
