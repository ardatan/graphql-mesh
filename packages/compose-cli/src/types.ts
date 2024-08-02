import type { DocumentNode, GraphQLSchema } from 'graphql';
import type { ComposeSubgraphsOptions } from '@graphql-mesh/fusion-composition';
import type { Logger, MeshFetch } from '@graphql-mesh/types';
import type { MaybePromise } from '@graphql-tools/utils';
import type { fetch as defaultFetch } from '@whatwg-node/fetch';

export interface MeshComposeCLIConfig extends ComposeSubgraphsOptions {
  /**
   * The output destination of the resulting composed GraphQL schema.
   * By default, the CLI will write the result to stdout.
   */
  output?: string;
  subgraphs: MeshComposeCLISubgraphConfig[];
  /**
   * TODO: Implement root level transforms later
  transforms?: MeshComposeCLITransformConfig[];
   */
  additionalTypeDefs?: string | DocumentNode | (string | DocumentNode)[];
  subgraph?: string;
  fetch?: MeshFetch;
  cwd?: string;
}

export interface MeshComposeCLISubgraphConfig {
  sourceHandler: MeshComposeCLISourceHandlerDef;
  transforms?: MeshComposeCLITransformConfig[];
}

export type MeshComposeCLISourceHandlerDef = (ctx: LoaderContext) => {
  name: string;
  schema$: MaybePromise<GraphQLSchema>;
};

export type MeshComposeCLITransformConfig = (input: GraphQLSchema, ...args: any[]) => GraphQLSchema;

export interface LoaderContext {
  fetch: MeshFetch;
  cwd: string;
  logger: Logger;
}

/**
 * Type helper for defining the config.
 */
export function defineConfig(config: MeshComposeCLIConfig) {
  return config;
}
