import type { DocumentNode, GraphQLSchema } from 'graphql';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import {
  resolveSubgraphSchema,
  type ResolveSubgraphSchemaTransport,
  type SubgraphSchemaInput,
} from './resolveSubgraphSchema.js';
import type { MeshComposeCLISourceHandlerDef } from './types.js';

export type SubgraphFromSdlTransportConfig = ResolveSubgraphSchemaTransport;

export type SubgraphFromSdlSource = MaybePromise<SubgraphSchemaInput>;

export interface LoadSubgraphFromSdlOptions {
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
}

/**
 * Load a hand-written subgraph for Compose as a `sourceHandler`.
 *
 * Prefer `defineConfig({ subgraphs: [{ name, schema }] })` when you do not need
 * a `sourceHandler` wrapper.
 *
 * `schema` accepts a path/URL string, inline SDL string, `DocumentNode`,
 * `GraphQLSchema`, or a Promise of any of those.
 */
export function loadSubgraphFromSDL(
  name: string,
  schema: SubgraphFromSdlSource,
  options: LoadSubgraphFromSdlOptions = {},
): MeshComposeCLISourceHandlerDef {
  return ctx => ({
    name,
    schema$: resolveSubgraphSchema(ctx, {
      subgraphName: name,
      schema,
      composeConnect: options.composeConnect,
      transport: options.transport,
    }),
  });
}

/**
 * @deprecated Use {@link loadSubgraphFromSDL} or `subgraphs: [{ name, schema }]`.
 */
export function loadSdlSubgraph(
  subgraphName: string,
  options: {
    federationReady?: boolean;
    composeConnect?: boolean;
    transport?: ResolveSubgraphSchemaTransport;
  } & (
    | { source: string; typeDefs?: never }
    | { typeDefs: string | DocumentNode; source?: never }
  ),
): MeshComposeCLISourceHandlerDef {
  const schemaInput: GraphQLSchema | DocumentNode | string =
    'typeDefs' in options && options.typeDefs != null ? options.typeDefs : options.source!;
  return loadSubgraphFromSDL(subgraphName, schemaInput, {
    composeConnect: options.composeConnect ?? options.federationReady,
    transport: options.transport,
  });
}

/** @deprecated Use {@link loadSubgraphFromSDL}. */
export type SdlSubgraphLoaderConfiguration = Parameters<typeof loadSdlSubgraph>[1];
export type SdlSubgraphTransportConfig = ResolveSubgraphSchemaTransport;
