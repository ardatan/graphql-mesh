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
} & (
  | {
      /**
       * Lazy loader (OpenAPI, SQL, HTTP introspection, …).
       */
      sourceHandler: MeshComposeCLISourceHandlerDef;
      name?: never;
      schema?: never;
      composeConnect?: never;
      transport?: never;
    }
  | {
      /**
       * Subgraph name when supplying {@link schema} directly (hand-written SDL).
       */
      name: string;
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
       * When true (default), stamp `@composeDirective(name: "@connect")` if the
       * schema already links Federation Connectors.
       *
       * @default true
       */
      composeConnect?: boolean;
      /**
       * Partial `@transport` fields: merge onto an existing stamp, or add one.
       */
      transport?: ResolveSubgraphSchemaTransport;
      sourceHandler?: never;
    }
);

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
