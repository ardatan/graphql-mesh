import {
  buildASTSchema,
  GraphQLSchema,
  parse,
  type DocumentNode,
  type GraphQLDirective,
} from 'graphql';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import {
  importMeshDirectives,
  isUrl,
  readFile,
  TransportDirective as transportDirective,
  validateMeshDirectives,
} from '@graphql-mesh/utils';
import { getDirectiveExtensions, isValidPath } from '@graphql-tools/utils';
import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import type { LoaderContext } from './types.js';

/**
 * Partial `@transport` fields for hand-written SDL.
 * Provided keys are merged onto an existing `@transport` (if any); otherwise a
 * new one is created. Nested `options` are shallow-merged.
 */
export interface ResolveSubgraphSchemaTransport {
  kind?: string;
  location?: string;
  headers?: [string, string][];
  options?: Record<string, unknown>;
}

export type SubgraphSchemaInput = GraphQLSchema | DocumentNode | string;

export interface ResolveSubgraphSchemaOptions {
  /**
   * Inline SDL, path/URL to SDL, parsed document, or a ready `GraphQLSchema`
   * (or a Promise of any of those).
   */
  schema: MaybePromise<SubgraphSchemaInput>;
  /**
   * Partial `@transport` fields: merge onto an existing stamp, or add one.
   */
  transport?: ResolveSubgraphSchemaTransport;
  /**
   * Optional subgraph name. When omitted, taken from `@transport(subgraph:)`.
   * When both are set and differ, a conflict error is thrown.
   */
  subgraphName?: string;
}

export interface ResolvedSubgraphSchema {
  name: string;
  schema: GraphQLSchema;
}

function looksLikeInlineSdl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return /^(type|schema|extend|directive|scalar|enum|input|union|interface)\b/m.test(trimmed);
}

function documentFromTypeDefs(typeDefs: string | DocumentNode): DocumentNode {
  if (typeof typeDefs === 'string') {
    return parse(typeDefs, { noLocation: true });
  }
  return typeDefs;
}

function firstTransportArgs(existing: unknown): Record<string, any> | undefined {
  if (existing == null) {
    return undefined;
  }
  if (Array.isArray(existing)) {
    const first = existing[0];
    return first && typeof first === 'object' ? { ...first } : undefined;
  }
  if (typeof existing === 'object') {
    return { ...(existing as Record<string, any>) };
  }
  return undefined;
}

function readTransportSubgraph(schema: GraphQLSchema): string | undefined {
  const fromExt = firstTransportArgs(
    (schema.extensions as any)?.directives?.transport ?? getDirectiveExtensions(schema)?.transport,
  );
  const value = fromExt?.subgraph;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Resolve the subgraph name from config and/or `@transport(subgraph:)`.
 *
 * - Config name only → use it
 * - Transport subgraph only → use it
 * - Both, equal → use it
 * - Both, different → throw conflict
 * - Neither → throw (name required)
 */
export function resolveSubgraphName(schema: GraphQLSchema, configName?: string): string {
  const fromTransport = readTransportSubgraph(schema);
  if (
    configName != null &&
    configName.length > 0 &&
    fromTransport != null &&
    configName !== fromTransport
  ) {
    throw new Error(
      `Subgraph name conflict: config name "${configName}" does not match @transport(subgraph: "${fromTransport}")`,
    );
  }
  const name =
    (configName != null && configName.length > 0 ? configName : undefined) ?? fromTransport;
  if (name == null || name.length === 0) {
    throw new Error(
      'Subgraph name is required: set `subgraphs[].name` or include `@transport(subgraph: ...)` on the schema',
    );
  }
  return name;
}

function withoutTransportAstDirectives<
  T extends { directives?: readonly any[] } | null | undefined,
>(node: T): T {
  if (!node?.directives?.length) {
    return node;
  }
  const directives = node.directives.filter(d => d.name.value !== 'transport');
  if (directives.length === node.directives.length) {
    return node;
  }
  return { ...node, directives };
}

/**
 * Merge `transport` option fields onto schema `@transport`.
 * Existing stamp is patched; missing stamp is created (requires `kind`).
 */
function applyTransportOptions(
  subgraphName: string,
  schema: GraphQLSchema,
  transport: ResolveSubgraphSchemaTransport | undefined,
): GraphQLSchema {
  if (!transport) {
    return schema;
  }
  const hasPatch =
    transport.kind != null ||
    transport.location != null ||
    transport.headers != null ||
    (transport.options != null && Object.keys(transport.options).length > 0);
  if (!hasPatch) {
    return schema;
  }

  const schemaExtensions: any = (schema.extensions ||= {});
  const existingDirectives =
    schemaExtensions.directives && typeof schemaExtensions.directives === 'object'
      ? { ...schemaExtensions.directives }
      : {};
  const existingRaw = existingDirectives.transport ?? getDirectiveExtensions(schema)?.transport;
  const existing = firstTransportArgs(existingRaw);
  const kind = transport.kind ?? existing?.kind;
  if (kind == null) {
    // Creating a new `@transport` requires `kind`; ignore empty/partial patches.
    return schema;
  }

  const next: Record<string, any> = {
    ...(existing || {}),
    subgraph: existing?.subgraph ?? subgraphName,
    kind,
  };
  if (transport.location != null) {
    next.location = transport.location;
  }
  if (transport.headers != null) {
    next.headers = transport.headers;
  }
  if (transport.options != null && Object.keys(transport.options).length > 0) {
    next.options = {
      ...(existing?.options && typeof existing.options === 'object' ? existing.options : {}),
      ...transport.options,
    };
  }

  // Preserve array shape when the schema already used one; drop AST apps so
  // extensions are the source of truth after a patch.
  existingDirectives.transport = Array.isArray(existingRaw)
    ? [next, ...existingRaw.slice(1)]
    : next;

  const schemaConfig = schema.toConfig();
  const directives = schema.getDirective('transport')
    ? schemaConfig.directives
    : [...schemaConfig.directives, transportDirective as GraphQLDirective];
  return new GraphQLSchema({
    ...schemaConfig,
    directives,
    astNode: withoutTransportAstDirectives(schemaConfig.astNode),
    extensionASTNodes: schemaConfig.extensionASTNodes?.map(withoutTransportAstDirectives),
    extensions: {
      ...schemaConfig.extensions,
      directives: existingDirectives,
    },
  });
}

function finalizeSchema(
  configName: string | undefined,
  schema: GraphQLSchema,
  options: Pick<ResolveSubgraphSchemaOptions, 'transport'>,
): ResolvedSubgraphSchema {
  // Resolve name from config / existing `@transport` before stamping patches.
  const name = resolveSubgraphName(schema, configName);
  let next = applyTransportOptions(name, schema, options.transport);
  // Re-check after patch (e.g. transport created with subgraph).
  const confirmed = resolveSubgraphName(next, configName);
  // Hand SDL with `@transport` but no Mesh core `@link` importing it — stamp before validate.
  const dirs = getDirectiveExtensions(next);
  const hasTransport = !!dirs?.transport;
  const hasCoreTransportLink = (dirs?.link || []).some(
    (l: { url?: string; import?: unknown[] }) => {
      if (typeof l?.url !== 'string') return false;
      if (
        !l.url.includes('specs.graphql-mesh.com/core/') &&
        !l.url.includes('the-guild.dev/graphql/mesh/spec/') &&
        !l.url.includes('graphql-mesh.com/spec/')
      ) {
        return false;
      }
      const imports = l.import || [];
      return imports.some(
        i =>
          i === '@transport' ||
          (i && typeof i === 'object' && (i as { name?: string }).name === '@transport'),
      );
    },
  );
  if (hasTransport && !hasCoreTransportLink) {
    next = importMeshDirectives(next, ['@transport']);
  }
  // GM-37: hand-written SDL Mesh directive syntax / @link contract.
  validateMeshDirectives(next, {
    consumer: `@graphql-mesh/compose-cli(subgraph: ${confirmed})`,
  });
  return { name: confirmed, schema: next };
}

function buildFromInput(input: SubgraphSchemaInput): GraphQLSchema {
  if (input instanceof GraphQLSchema) {
    return input;
  }
  if (typeof input !== 'string') {
    return buildASTSchema(input, { assumeValidSDL: true, assumeValid: true });
  }
  return buildASTSchema(documentFromTypeDefs(input), {
    assumeValidSDL: true,
    assumeValid: true,
  });
}

/**
 * Resolve a hand-written / in-memory subgraph `schema` value to a named schema.
 */
export function resolveSubgraphSchema(
  ctx: LoaderContext,
  options: ResolveSubgraphSchemaOptions,
): MaybePromise<ResolvedSubgraphSchema> {
  const configName = options.subgraphName;
  const label = configName ?? '<unnamed>';
  return handleMaybePromise(
    () => options.schema,
    schemaInput => {
      if (schemaInput instanceof GraphQLSchema || typeof schemaInput !== 'string') {
        return finalizeSchema(configName, buildFromInput(schemaInput), options);
      }

      // Inline SDL first (before env interpolation, which can break GraphQL type names).
      if (looksLikeInlineSdl(schemaInput)) {
        return finalizeSchema(configName, buildFromInput(schemaInput), options);
      }
      const rawSource = stringInterpolator.parse(schemaInput, {
        env: globalThis.process?.env,
      });
      if (isUrl(rawSource)) {
        return handleMaybePromise(
          () => ctx.fetch(rawSource),
          res => {
            if (!res.ok) {
              throw new Error(
                `Failed to load subgraph "${label}" from ${rawSource}: ${res.statusText}`,
              );
            }
            return handleMaybePromise(
              () => res.text(),
              text => finalizeSchema(configName, buildFromInput(text), options),
            );
          },
        );
      }
      if (isValidPath(rawSource)) {
        return handleMaybePromise(
          () =>
            readFile(rawSource, {
              allowUnknownExtensions: true,
              cwd: ctx.cwd,
              fetch: ctx.fetch,
              importFn: (p: string) => import(p),
              log: ctx.log,
            }),
          (text: unknown) => finalizeSchema(configName, buildFromInput(String(text)), options),
        );
      }
      return finalizeSchema(configName, buildFromInput(rawSource), options);
    },
  );
}
