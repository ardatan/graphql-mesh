import {
  buildASTSchema,
  buildSchema,
  isSchema,
  type DocumentNode,
  type GraphQLSchema,
  type Source,
} from 'graphql';
import type { Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import type { KeyValueCache, MeshFetch } from '@graphql-mesh/types';
import { addResolversToSchema } from '@graphql-tools/schema';
import { isDocumentNode, type IResolvers } from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { wireResolveReferenceFromResolvers } from './entities.js';
import { ensureFederationEntitiesField, ensureFederationServiceField } from './federation-root.js';
import { wireLookupEntityResolvers } from './lookup.js';
import { wirePubSubDirectives } from './pubsub.js';
import { extractMeshSourceTransforms } from './source-transforms.js';
import {
  applyTransportExecution,
  type ApplyTransportOptions,
  type TransportsOption,
} from './transports.js';

/**
 * Mesh subgraph SDL (generated or hand-written), a parsed document, or an
 * existing `GraphQLSchema`.
 */
export type BuildSubgraphSchemaInput = string | DocumentNode | Source | GraphQLSchema;

export interface BuildSubgraphSchemaOptions extends ApplyTransportOptions {
  /**
   * Optional resolvers merged onto the schema after SDL parse and before
   * transport / `@lookup` wiring. Use for fields without Mesh directives.
   */
  resolvers?: IResolvers | IResolvers[];
  /**
   * When true, skip automatic transport `processDirectives` /
   * `getSubgraphExecutor` wiring. `@lookup` / Federation root fields still run.
   */
  skipTransports?: boolean;
  fetch?: MeshFetch;
  log?: Logger;
  /**
   * When provided, wires Mesh `@pubsubOperation` / `@pubsubPublish`.
   * When omitted, those directives are left as a clear no-op (no subscribe /
   * publish side effects installed).
   */
  pubsub?: PubSub;
  cwd?: string;
  cache?: KeyValueCache;
  transports?: TransportsOption;
}

function coerceToSchema(input: BuildSubgraphSchemaInput): GraphQLSchema {
  if (isSchema(input)) {
    return input;
  }
  if (isDocumentNode(input)) {
    return buildASTSchema(input, {
      assumeValid: true,
      assumeValidSDL: true,
    });
  }
  // string | Source
  return buildSchema(input as string | Source, {
    assumeValid: true,
    assumeValidSDL: true,
  });
}

/**
 * Build an executable Federation subgraph schema from Mesh subgraph SDL.
 *
 * Accepts **generated** loader output and **hand-written** SDL the same way:
 * Mesh / Connectors / protocol directives become field resolvers via the
 * matching transport, and Federation Spec draft `@lookup` / `@is` / `@internal`
 * become entity resolution for `Query._entities`. Mesh `@merge` list/batch
 * entry fields stay as ordinary Query fields (not deprecated).
 *
 * Mesh stitching `@source` / `@meshSource` reverse rename stamps (resolved via
 * Mesh `@link` import URL — never Apollo Connectors SCHEMA `@source` from
 * `specs.apollo.dev/connect`) so transports hit original names; wrap transforms
 * restore the public surface — same path Hive Gateway uses for stamped SDL.
 *
 * Pass `pubsub` to wire `@pubsubOperation` / `@pubsubPublish`; omit it to leave
 * those directives as a no-op.
 *
 * The result is a normal `GraphQLSchema` you can pass to Yoga, Apollo Server,
 * or any GraphQL server and serve as a subgraph for Apollo Router or Hive Gateway.
 *
 * @example
 * ```ts
 * import { createServer } from 'node:http';
 * import { createYoga } from 'graphql-yoga';
 * import { buildSubgraphSchema } from '@graphql-mesh/subgraph';
 *
 * // Generated or hand-written Mesh subgraph SDL
 * const schema = await buildSubgraphSchema(typeDefs, { fetch });
 * const yoga = createYoga({ schema });
 * createServer(yoga).listen(4001);
 * ```
 */
export function buildSubgraphSchema(
  typeDefs: BuildSubgraphSchemaInput,
  options: BuildSubgraphSchemaOptions = {},
): MaybePromise<GraphQLSchema> {
  let schema = coerceToSchema(typeDefs);

  if (options.resolvers) {
    const resolversList = Array.isArray(options.resolvers)
      ? options.resolvers
      : [options.resolvers];
    for (const resolvers of resolversList) {
      schema = addResolversToSchema({
        schema,
        resolvers,
        updateResolversInPlace: false,
      });
      // `addResolversToSchema` does not install `__resolveReference`; wire it.
      wireResolveReferenceFromResolvers(schema, resolvers as Record<string, any>);
    }
  }

  // Mesh `@source` / `@meshSource`: restore original names for transport execution;
  // wrap transforms re-apply the public stamped names after.
  const { schema: sourceReversed, transforms: sourceTransforms } =
    extractMeshSourceTransforms(schema);
  schema = sourceReversed;

  const finalize = (executable: GraphQLSchema): GraphQLSchema => {
    let next = executable;
    if (sourceTransforms.length) {
      next = wrapSchema({
        schema: next,
        transforms: sourceTransforms,
      });
    }
    // Optional pubsub: wire Mesh `@pubsubOperation` / `@pubsubPublish`, or no-op.
    next = wirePubSubDirectives(next, options.pubsub);
    // After transports / Mesh `@source` wrap rebuild types, re-apply user
    // `__resolveReference` (public type names) then `@lookup` / `@is`.
    if (options.resolvers) {
      const resolversList = Array.isArray(options.resolvers)
        ? options.resolvers
        : [options.resolvers];
      for (const resolvers of resolversList) {
        wireResolveReferenceFromResolvers(next, resolvers as Record<string, any>);
      }
    }
    next = wireLookupEntityResolvers(next);
    // Transports (connect/sql/…) may already install `_entities`; repair if needed.
    // Also includes `@key` types (pass-through when no resolveReference).
    next = ensureFederationEntitiesField(next);
    next = ensureFederationServiceField(next);
    return next;
  };

  if (options.skipTransports) {
    return finalize(schema);
  }

  return handleMaybePromise(
    () =>
      applyTransportExecution(schema, {
        fetch: options.fetch,
        log: options.log,
        pubsub: options.pubsub,
        cwd: options.cwd,
        cache: options.cache,
        transports: options.transports,
      }),
    finalize,
  );
}
