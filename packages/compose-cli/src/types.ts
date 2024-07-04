import type { DocumentNode, GraphQLSchema } from 'graphql';
import type { ComposeSubgraphsOptions } from '@graphql-mesh/fusion-composition';
import type { Logger } from '@graphql-mesh/types';
import type { fetch as defaultFetch } from '@whatwg-node/fetch';

export interface MeshComposeCLIConfig extends ComposeSubgraphsOptions {
  /**
   * The output destination of the resulting composed GraphQL schema.
   * By default, the CLI will write the result to stdout.
   */
  output?: string;
  subgraphs: MeshComposeCLISubgraphConfig[];
  transforms?: MeshComposeCLITransformConfig[];
  additionalTypeDefs?: string | DocumentNode | (string | DocumentNode)[];
  subgraph?: string;
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
