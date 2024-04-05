import { DocumentNode, GraphQLSchema } from 'graphql';
import { Logger } from '@graphql-mesh/types';
import { fetch as defaultFetch } from '@whatwg-node/fetch';

export interface MeshComposeCLIConfig {
  subgraphs: MeshComposeCLISubgraphConfig[];
  transforms?: MeshComposeCLITransformConfig[];
  additionalTypeDefs?: string | DocumentNode | (string | DocumentNode)[];
  target?: string;
  fetch?: typeof defaultFetch;
  cwd?: string;
}

export interface MeshComposeCLISubgraphConfig {
  sourceHandler: MeshComposeCLISourceHandlerDef;
  transforms?: MeshComposeCLITransformConfig[];
}

export type MeshComposeCLISourceHandlerDef = (ctx: LoaderContext) => {
  name: string;
  schema$: Promise<GraphQLSchema> | GraphQLSchema;
};

export type MeshComposeCLITransformConfig = (input: GraphQLSchema, ...args: any[]) => GraphQLSchema;

export interface LoaderContext {
  fetch: typeof defaultFetch;
  cwd: string;
  logger: Logger;
}

/**
 * Type helper for defining the config.
 */
export function defineConfig(config: MeshComposeCLIConfig) {
  return config;
}
