import {
  buildASTSchema,
  buildSchema,
  isSchema,
  Kind,
  print,
  printSchema,
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
export type BuildSubgraphTypeDefs = string | DocumentNode | Source | GraphQLSchema;

/**
 * One schema module: `typeDefs` plus optional resolvers, matching the
 * `{ typeDefs, resolvers }` shape used by `@apollo/subgraph`.
 *
 * Mesh also accepts `string` / `Source` / `GraphQLSchema` for `typeDefs`
 * (generated and hand-written Mesh SDL), not only `DocumentNode`.
 */
export interface GraphQLSchemaModule {
  typeDefs: BuildSubgraphTypeDefs | BuildSubgraphTypeDefs[];
  resolvers?: IResolvers | IResolvers[];
}

/**
 * First argument to {@link buildSubgraphSchema}: a schema config object,
 * an array of modules (and/or bare typeDefs), or bare Mesh subgraph SDL.
 *
 * @example Object form
 * ```ts
 * await buildSubgraphSchema({ typeDefs, resolvers }, { fetch })
 * ```
 *
 * @example Array form
 * ```ts
 * await buildSubgraphSchema([{ typeDefs, resolvers }], { fetch })
 * ```
 *
 * @example SDL-only (Mesh transports from directives)
 * ```ts
 * await buildSubgraphSchema(typeDefs, { fetch })
 * ```
 */
export type BuildSubgraphSchemaInput =
  GraphQLSchemaModule | (GraphQLSchemaModule | BuildSubgraphTypeDefs)[] | BuildSubgraphTypeDefs;

/** @deprecated Use {@link BuildSubgraphTypeDefs} for bare SDL inputs. */
export type BuildSubgraphSchemaTypeDefs = BuildSubgraphTypeDefs;

export interface BuildSubgraphSchemaOptions extends ApplyTransportOptions {
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

function isSourceLike(value: unknown): value is Source {
  return (
    typeof value === 'object' &&
    value != null &&
    'body' in value &&
    typeof (value as Source).body === 'string'
  );
}

function isGraphQLSchemaModule(value: unknown): value is GraphQLSchemaModule {
  return (
    typeof value === 'object' &&
    value != null &&
    !Array.isArray(value) &&
    !isSchema(value) &&
    !isDocumentNode(value) &&
    !isSourceLike(value) &&
    'typeDefs' in value
  );
}

function isBuildSubgraphTypeDefs(value: unknown): value is BuildSubgraphTypeDefs {
  return (
    typeof value === 'string' || isDocumentNode(value) || isSchema(value) || isSourceLike(value)
  );
}

function coerceToSchema(input: BuildSubgraphTypeDefs): GraphQLSchema {
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

function concatTypeDefs(parts: BuildSubgraphTypeDefs[]): BuildSubgraphTypeDefs {
  if (parts.length === 1) {
    return parts[0]!;
  }
  // Prefer DocumentNode concat when every part is a document; otherwise join SDL strings.
  if (parts.every(isDocumentNode)) {
    return {
      kind: Kind.DOCUMENT,
      definitions: parts.flatMap(doc => doc.definitions),
    };
  }
  if (parts.every(part => typeof part === 'string' || isSourceLike(part))) {
    return parts.map(part => (typeof part === 'string' ? part : (part as Source).body)).join('\n');
  }
  // Mixed GraphQLSchema / DocumentNode / string: print schemas then join.
  return parts
    .map(part => {
      if (typeof part === 'string') return part;
      if (isSourceLike(part)) return part.body;
      if (isDocumentNode(part)) return print(part);
      return printSchema(part);
    })
    .join('\n');
}

interface NormalizedModules {
  typeDefs: BuildSubgraphTypeDefs;
  resolvers: IResolvers[];
}

function normalizeModulesOrSDL(modulesOrSDL: BuildSubgraphSchemaInput): NormalizedModules {
  const modules: GraphQLSchemaModule[] = [];

  if (Array.isArray(modulesOrSDL)) {
    for (const entry of modulesOrSDL) {
      if (isGraphQLSchemaModule(entry)) {
        modules.push(entry);
      } else if (isBuildSubgraphTypeDefs(entry)) {
        modules.push({ typeDefs: entry });
      } else {
        throw new TypeError(
          'buildSubgraphSchema: array entries must be { typeDefs, resolvers? } or typeDefs (string | DocumentNode | Source | GraphQLSchema)',
        );
      }
    }
  } else if (isGraphQLSchemaModule(modulesOrSDL)) {
    modules.push(modulesOrSDL);
  } else if (isBuildSubgraphTypeDefs(modulesOrSDL)) {
    modules.push({ typeDefs: modulesOrSDL });
  } else {
    throw new TypeError(
      'buildSubgraphSchema: expected { typeDefs, resolvers? }, an array of modules, or Mesh subgraph typeDefs',
    );
  }

  if (modules.length === 0) {
    throw new TypeError('buildSubgraphSchema: at least one schema module is required');
  }

  const typeDefsParts: BuildSubgraphTypeDefs[] = [];
  const resolvers: IResolvers[] = [];

  for (const module of modules) {
    const defs = Array.isArray(module.typeDefs) ? module.typeDefs : [module.typeDefs];
    typeDefsParts.push(...defs);
    if (module.resolvers) {
      if (Array.isArray(module.resolvers)) {
        resolvers.push(...module.resolvers);
      } else {
        resolvers.push(module.resolvers);
      }
    }
  }

  return {
    typeDefs: concatTypeDefs(typeDefsParts),
    resolvers,
  };
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
 * First-argument shape matches `@apollo/subgraph`: `{ typeDefs, resolvers }`
 * or `[{ typeDefs, resolvers }]`. Mesh also accepts bare SDL
 * (`string` / `DocumentNode` / `Source` / `GraphQLSchema`). Mesh runtime
 * options (`fetch`, `pubsub`, transports, …) go in the second argument.
 *
 * Mesh stitching `@source` / `@meshSource` reverse rename stamps (resolved via
 * Mesh `@link` import URL — never Apollo Connectors SCHEMA `@source` from
 * `specs.apollo.dev/connect`) so transports hit original names; wrap transforms
 * restore the public surface — same path Hive Gateway uses for stamped SDL.
 *
 * Pass `pubsub` to wire `@pubsubOperation` / `@pubsubPublish`; omit it to leave
 * those directives as a no-op.
 *
 * Returns `MaybePromise<GraphQLSchema>` because transport wiring may be async.
 * Prefer `await buildSubgraphSchema(...)`.
 *
 * URL split: `@transport(location:)` (and Connect `@source` / protocol
 * endpoints) point at the **upstream API**. The URL you register with Apollo
 * Router / Hive Gateway / Rover is the **served subgraph** (Yoga / this
 * process), not that upstream location.
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
 * const schema = await buildSubgraphSchema({ typeDefs, resolvers }, { fetch });
 * // or: await buildSubgraphSchema([{ typeDefs, resolvers }], { fetch })
 * // or SDL-only: await buildSubgraphSchema(typeDefs, { fetch })
 * const yoga = createYoga({ schema });
 * createServer(yoga).listen(4001);
 * ```
 */
export function buildSubgraphSchema(
  modulesOrSDL: BuildSubgraphSchemaInput,
  options: BuildSubgraphSchemaOptions = {},
): MaybePromise<GraphQLSchema> {
  const { typeDefs, resolvers: resolversList } = normalizeModulesOrSDL(modulesOrSDL);
  let schema = coerceToSchema(typeDefs);

  for (const resolvers of resolversList) {
    schema = addResolversToSchema({
      schema,
      resolvers,
      updateResolversInPlace: false,
    });
    // `addResolversToSchema` does not install `__resolveReference`; wire it.
    wireResolveReferenceFromResolvers(schema, resolvers as Record<string, any>);
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
    for (const resolvers of resolversList) {
      wireResolveReferenceFromResolvers(next, resolvers as Record<string, any>);
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
