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
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { wireResolveReferenceFromResolvers } from './entities.js';
import { ensureFederationEntitiesField, ensureFederationServiceField } from './federation-root.js';
import { wireLookupEntityResolvers } from './lookup.js';
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

  const finalize = (executable: GraphQLSchema): GraphQLSchema => {
    // After transports install field resolvers, map Federation Spec `@lookup` /
    // `@is` onto `resolveReference` (skips types already wired via `entity: true`).
    let next = wireLookupEntityResolvers(executable);
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
