import {
  buildASTSchema,
  GraphQLSchema,
  parse,
  type DocumentNode,
  type GraphQLDirective,
} from 'graphql';
import { ensureFederationReadySubgraph } from '@graphql-mesh/fusion-composition';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { isUrl, readFile, TransportDirective as transportDirective } from '@graphql-mesh/utils';
import { isValidPath } from '@graphql-tools/utils';
import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import type { LoaderContext, MeshComposeCLISourceHandlerDef } from './types.js';

export interface SdlSubgraphTransportConfig {
  /**
   * Transport kind stamped onto `@transport(kind:)` when the SDL does not already
   * declare a transport.
   *
   * @example 'sql'
   * @example 'protobuf'
   */
  kind: string;
  /**
   * Optional endpoint / connection string for `@transport(location:)`.
   *
   * @example 'postgres://localhost/shop'
   */
  location?: string;
  /**
   * Optional header pairs for `@transport(headers:)`.
   */
  headers?: [string, string][];
  /**
   * Optional transport options bag.
   */
  options?: Record<string, unknown>;
}

export type SdlSubgraphLoaderConfiguration = {
  /**
   * When true (default), run {@link ensureFederationReadySubgraph} so Mesh
   * directives get Mesh-spec `@link` imports and `@composeDirective` (and
   * Connectors get `@composeDirective(name: "@connect")`).
   *
   * Set to false only when the SDL is already federation-ready and you want a
   * strict passthrough for registry round-trips.
   *
   * @default true
   */
  federationReady?: boolean;
  /**
   * Optional `@transport` stamp when the SDL does not already declare one.
   * Ignored when schema extensions already include `transport`.
   */
  transport?: SdlSubgraphTransportConfig;
} & (
  | {
      /**
       * Path, URL, or inline GraphQL SDL string.
       *
       * Paths are resolved from the compose cwd. URLs are fetched. Strings that
       * look like SDL (`type Query { ... }`) are parsed inline.
       *
       * @example './subgraphs/movies.graphql'
       * @example 'type Query { hello: String }'
       */
      source: string;
      typeDefs?: never;
    }
  | {
      /**
       * Inline SDL string or parsed `DocumentNode`.
       */
      typeDefs: string | DocumentNode;
      source?: never;
    }
);

function looksLikeInlineSdl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (/^(type|schema|extend|directive|scalar|enum|input|union|interface)\b/m.test(trimmed)) {
    return true;
  }
  return false;
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
  transport: SdlSubgraphTransportConfig | undefined,
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

/**
 * Load a hand-written (or generated-then-edited) subgraph SDL into Mesh Compose.
 *
 * Prefer this over a custom `sourceHandler` + `buildASTSchema(parse(readFileSync(...)))`
 * when feeding SDL into Compose or preparing subgraph SDL for schema registries.
 *
 * Include directive definitions in the SDL (or start from loader-emitted SDL) so
 * Mesh can register `@composeDirective` for those directives. Validation of
 * directive arg / selection syntax is a separate concern.
 *
 * @example
 * ```ts
 * import { defineConfig, loadSdlSubgraph } from '@graphql-mesh/compose-cli';
 *
 * export const composeConfig = defineConfig({
 *   subgraphs: [
 *     {
 *       sourceHandler: loadSdlSubgraph('movies', {
 *         source: './subgraphs/movies.graphql',
 *       }),
 *     },
 *   ],
 * });
 * ```
 *
 * @param subgraphName Subgraph name.
 * @param options SDL source / typeDefs and optional transport stamp.
 */
export function loadSdlSubgraph(
  subgraphName: string,
  options: SdlSubgraphLoaderConfiguration,
): MeshComposeCLISourceHandlerDef {
  const { federationReady = true, transport } = options;
  return (ctx: LoaderContext) => {
    const schema$: MaybePromise<GraphQLSchema> = handleMaybePromise(
      () => {
        if ('typeDefs' in options && options.typeDefs != null) {
          return documentFromTypeDefs(options.typeDefs);
        }
        const rawSource = stringInterpolator.parse(options.source, {
          env: globalThis.process?.env,
        });
        if (looksLikeInlineSdl(rawSource)) {
          return documentFromTypeDefs(rawSource);
        }
        if (isUrl(rawSource)) {
          return handleMaybePromise(
            () => ctx.fetch(rawSource),
            res => {
              if (!res.ok) {
                throw new Error(
                  `Failed to load SDL subgraph "${subgraphName}" from ${rawSource}: ${res.statusText}`,
                );
              }
              return handleMaybePromise(
                () => res.text(),
                text => documentFromTypeDefs(text),
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
            (text: unknown) => documentFromTypeDefs(String(text)),
          );
        }
        return documentFromTypeDefs(rawSource);
      },
      (document: DocumentNode) => {
        let schema = buildASTSchema(document, {
          assumeValidSDL: true,
          assumeValid: true,
        });
        schema = stampTransportIfNeeded(subgraphName, schema, transport);
        if (federationReady) {
          schema = ensureFederationReadySubgraph(schema);
        }
        return schema;
      },
    );
    return {
      name: subgraphName,
      schema$,
    };
  };
}
