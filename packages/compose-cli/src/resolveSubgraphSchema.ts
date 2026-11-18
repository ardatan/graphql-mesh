import {
  buildASTSchema,
  GraphQLSchema,
  parse,
  type DocumentNode,
  type GraphQLDirective,
} from 'graphql';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import {
  addConnectComposeDirective,
  isUrl,
  readFile,
  TransportDirective as transportDirective,
} from '@graphql-mesh/utils';
import { isValidPath } from '@graphql-tools/utils';
import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import type { LoaderContext } from './types.js';

export interface ResolveSubgraphSchemaTransport {
  kind: string;
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
   * When true (default), stamp `@composeDirective(name: "@connect")` if the
   * schema already links the Federation Connectors spec.
   *
   * Mesh `@link` / `@composeDirective` for Mesh directives must already be in
   * the SDL (or come from a loader via `importMeshDirectives`).
   *
   * @default true
   */
  composeConnect?: boolean;
  /**
   * Optional `@transport` stamp when the schema does not already declare one.
   */
  transport?: ResolveSubgraphSchemaTransport;
  subgraphName: string;
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

function stampTransportIfNeeded(
  subgraphName: string,
  schema: GraphQLSchema,
  transport: ResolveSubgraphSchemaTransport | undefined,
): GraphQLSchema {
  if (!transport?.kind) {
    return schema;
  }
  const schemaExtensions: any = (schema.extensions ||= {});
  schemaExtensions.directives ||= {};
  if (schemaExtensions.directives.transport) {
    return schema;
  }
  schemaExtensions.directives.transport = {
    subgraph: subgraphName,
    kind: transport.kind,
    ...(transport.location != null ? { location: transport.location } : {}),
    ...(transport.headers != null ? { headers: transport.headers } : {}),
    ...(transport.options != null && Object.keys(transport.options).length
      ? { options: transport.options }
      : {}),
  };
  if (schema.getDirective('transport')) {
    return schema;
  }
  const schemaConfig = schema.toConfig();
  return new GraphQLSchema({
    ...schemaConfig,
    directives: [...schemaConfig.directives, transportDirective as GraphQLDirective],
  });
}

function finalizeSchema(
  subgraphName: string,
  schema: GraphQLSchema,
  options: Pick<ResolveSubgraphSchemaOptions, 'composeConnect' | 'transport'>,
): GraphQLSchema {
  let next = stampTransportIfNeeded(subgraphName, schema, options.transport);
  if (options.composeConnect !== false) {
    next = addConnectComposeDirective(next);
  }
  return next;
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
 * Resolve a hand-written / in-memory subgraph `schema` value to a `GraphQLSchema`.
 */
export function resolveSubgraphSchema(
  ctx: LoaderContext,
  options: ResolveSubgraphSchemaOptions,
): MaybePromise<GraphQLSchema> {
  const { subgraphName } = options;
  return handleMaybePromise(
    () => options.schema,
    schemaInput => {
      if (schemaInput instanceof GraphQLSchema || typeof schemaInput !== 'string') {
        return finalizeSchema(subgraphName, buildFromInput(schemaInput), options);
      }

      // Inline SDL first (before env interpolation, which can break GraphQL type names).
      if (looksLikeInlineSdl(schemaInput)) {
        return finalizeSchema(subgraphName, buildFromInput(schemaInput), options);
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
                `Failed to load subgraph "${subgraphName}" from ${rawSource}: ${res.statusText}`,
              );
            }
            return handleMaybePromise(
              () => res.text(),
              text => finalizeSchema(subgraphName, buildFromInput(text), options),
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
          (text: unknown) =>
            finalizeSchema(subgraphName, buildFromInput(String(text)), options),
        );
      }
      return finalizeSchema(subgraphName, buildFromInput(rawSource), options);
    },
  );
}
