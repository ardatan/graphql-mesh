import type { DocumentNode, GraphQLSchema } from 'graphql';
import type { ComposeSubgraphsOptions } from '@graphql-mesh/fusion-composition';
import type { MeshFetch } from '@graphql-mesh/types';
import type { fetch as defaultFetch } from '@whatwg-node/fetch';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { Logger } from '@graphql-hive/logger';

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
  log: Logger;
}

/**
 * Type helper for defining the config.
 */
export function defineConfig(config: MeshComposeCLIConfig) {
  return config;
}
