import type { DocumentNode, GraphQLSchema } from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import type { ComposeSubgraphsOptions } from '@graphql-mesh/fusion-composition';
import type { MeshFetch } from '@graphql-mesh/types';
import type { fetch as defaultFetch } from '@whatwg-node/fetch';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import type {
  ResolveSubgraphSchemaTransport,
  SubgraphSchemaInput,
} from './resolveSubgraphSchema.js';

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

export type MeshComposeCLISubgraphConfig = {
  transforms?: MeshComposeCLITransformConfig[];
  /**
   * Optional URL written to `@join__graph(url:)`.
   *
   * When omitted, the join URL comes from `@transport(location:)` (or Connectors
   * `@source(http.baseURL)`). When set, `@transport(location:)` stays the upstream
   * API endpoint while the join graph URL uses this value (for example a served
   * subgraph URL). Without Mesh Compose, Router overlays use `routing_url` instead.
   *
   * @example 'http://localhost:4001/graphql'
   */
  routingUrl?: string;
} & (
  | {
      /**
       * Lazy loader (OpenAPI, SQL, HTTP introspection, …).
       */
      sourceHandler: MeshComposeCLISourceHandlerDef;
      name?: never;
      schema?: never;
      transport?: never;
    }
  | {
      /**
       * Optional subgraph name when supplying {@link schema} directly.
       *
       * When omitted, the name is taken from `@transport(subgraph: ...)`.
       * When both are set and differ, Compose throws a conflict error.
       * When neither is set, Compose throws (name required).
       */
      name?: string;
      /**
       * Hand-written or in-memory subgraph SDL / schema.
       *
       * - `GraphQLSchema`: used as-is
       * - `DocumentNode`: built with `assumeValidSDL`
       * - `string`: inline SDL, or a path / URL to an `.graphql` file
       * - `Promise` of any of the above
       *
       * Mesh `@link` / `@composeDirective` applications belong in the SDL itself
       * (or come from a loader via `importMeshDirectives`). Compose does not invent
       * Mesh directive imports.
       */
      schema: MaybePromise<SubgraphSchemaInput>;
      /**
       * Partial `@transport` fields: merge onto an existing stamp, or add one.
       */
      transport?: ResolveSubgraphSchemaTransport;
      sourceHandler?: never;
    }
);

export type MeshComposeCLISourceHandlerDef = (ctx: LoaderContext) => {
  /**
   * Optional when the schema already has `@transport(subgraph: ...)`.
   * Conflict / missing-name rules match {@link MeshComposeCLISubgraphConfig}.
   */
  name?: string;
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
