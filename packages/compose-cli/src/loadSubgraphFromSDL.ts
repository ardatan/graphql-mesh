import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';
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
   * Partial `@transport` fields: merge onto an existing stamp, or add one.
   */
  transport?: ResolveSubgraphSchemaTransport;
}

/**
 * Load a hand-written subgraph for Compose as a `sourceHandler`.
 *
 * Prefer `defineConfig({ subgraphs: [{ name?, schema }] })` when you do not need
 * a `sourceHandler` wrapper.
 *
 * `name` is optional when the schema already has `@transport(subgraph: ...)`.
 * `schema` accepts a path/URL string, inline SDL string, `DocumentNode`,
 * `GraphQLSchema`, or a Promise of any of those.
 */
export function loadSubgraphFromSDL(
  name: string | undefined,
  schema: SubgraphFromSdlSource,
  options: LoadSubgraphFromSdlOptions = {},
): MeshComposeCLISourceHandlerDef {
  return ctx => ({
    name,
    schema$: handleMaybePromise(
      () =>
        resolveSubgraphSchema(ctx, {
          subgraphName: name,
          schema,
          transport: options.transport,
        }),
      resolved => resolved.schema,
    ),
  });
}
