import { GraphQLSchema } from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import {
  assertSupportedMeshSpec,
  MESH_SPEC_URL,
  type AssertSupportedMeshSpecOptions,
  type ParsedMeshSpecUrl,
} from './mesh-spec.js';
import { TransportDirective } from './transport-directive.js';

/**
 * Patch only the named schema-directive keys on `extensions.directives`.
 * Preserves loader-stamped shapes for other keys (e.g. object `@transport` vs array).
 */
function patchSchemaDirectiveExtensions(
  subgraph: GraphQLSchema,
  patch: Record<string, unknown>,
): void {
  const extensions: Record<string, any> = (subgraph.extensions ||= {});
  const existing =
    extensions.directives && typeof extensions.directives === 'object'
      ? { ...extensions.directives }
      : {};
  for (const [key, value] of Object.entries(patch)) {
    existing[key] = value;
  }
  extensions.directives = existing;
}

export function addFederation2DirectivesToSubgraph(subgraph: GraphQLSchema) {
  const schemaDirectives = getDirectiveExtensions(subgraph);
  const linkDirectives = (schemaDirectives.link ||= []);
  if (
    !linkDirectives.some(linkDirectiveArgs =>
      linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/link/'),
    )
  ) {
    linkDirectives.push({
      url: 'https://specs.apollo.dev/link/v1.0',
    });
  }
  if (
    !linkDirectives.some(linkDirectiveArgs =>
      linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/federation/'),
    )
  ) {
    linkDirectives.push({
      url: 'https://specs.apollo.dev/federation/v2.6',
      import: [],
    });
  }
  patchSchemaDirectiveExtensions(subgraph, { link: linkDirectives });
  return subgraph;
}

export function importFederationDirectives(subgraph: GraphQLSchema, directives: string[]) {
  const schemaDirectives = getDirectiveExtensions(subgraph);
  const linkDirectives = (schemaDirectives.link ||= []);
  let importStatement = linkDirectives.find(linkDirectiveArgs =>
    linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/federation/'),
  );
  if (!importStatement) {
    importStatement = {
      url: 'https://specs.apollo.dev/federation/v2.6',
      import: [],
    };
    linkDirectives.push(importStatement);
  }
  // v2.0 is not supported so bump to v2.6
  const match = importStatement.url.match(/\/v(\d+)\.(\d+)(?:$|\/)/);
  if (match) {
    const major = Number(match[1]);
    const minor = Number(match[2]);
    // Bump only older 2.x (2.0–2.5) to v2.6, leave >=2.6 as-is
    if (major === 2 && minor < 6) {
      importStatement.url = 'https://specs.apollo.dev/federation/v2.6';
    }
  }
  importStatement.import = [...new Set([...(importStatement.import || []), ...directives])];
  patchSchemaDirectiveExtensions(subgraph, { link: linkDirectives });
  return subgraph;
}

export type MeshDirectiveImport = string | { name: string; as?: string };

function meshDirectiveImportKey(directive: MeshDirectiveImport): string {
  if (typeof directive === 'string') {
    return directive;
  }
  return directive.as || directive.name;
}

function normalizeMeshDirectiveImport(value: unknown): { name: string; local: string } | null {
  if (typeof value === 'string') {
    return { name: value, local: value };
  }
  if (value && typeof value === 'object' && 'name' in (value as object)) {
    const obj = value as { name?: string; as?: string };
    if (typeof obj.name !== 'string') {
      return null;
    }
    return { name: obj.name, local: obj.as || obj.name };
  }
  return null;
}

function meshDirectiveImportsEqual(a: unknown, b: MeshDirectiveImport): boolean {
  const left = normalizeMeshDirectiveImport(a);
  const right = normalizeMeshDirectiveImport(b);
  if (!left || !right) {
    return false;
  }
  // Deduplicate only when both the imported name and effective local name match.
  return left.name === right.name && left.local === right.local;
}

export interface ImportMeshDirectivesOptions {
  /**
   * `@link` URL to stamp / extend. Defaults to {@link MESH_SPEC_URL}
   * (`https://specs.graphql-mesh.dev/core/v0.1`) for shared Mesh core directives.
   * Protocol loaders pass {@link meshSpecUrl} e.g. `meshSpecUrl('thrift')` for
   * protocol-only imports; stamp `@transport` separately under the core URL.
   */
  url?: string;
}

/**
 * Import Mesh-spec directives (optionally aliased, e.g. `{ name: '@source', as: '@meshSource' }`)
 * and register them with `@composeDirective` under the *local* name.
 *
 * Loaders call this with the directives they emit - there is no auto-scan helper.
 * Shared Mesh core directives default to {@link MESH_SPEC_URL} (`core/v0.1`).
 * Protocol-only imports pass {@link ImportMeshDirectivesOptions.url}
 * (e.g. `meshSpecUrl('sql')`) so each loader can version independently.
 */
export function importMeshDirectives(
  subgraph: GraphQLSchema,
  directives: MeshDirectiveImport[],
  options?: ImportMeshDirectivesOptions,
) {
  // Federation `@composeDirective` requires a matching directive definition on the subgraph.
  if (
    directives.some(d => meshDirectiveImportKey(d) === '@transport') &&
    subgraph.getDirective('transport') == null
  ) {
    const config = subgraph.toConfig();
    subgraph = new GraphQLSchema({
      ...config,
      directives: [...config.directives, TransportDirective],
    });
  }
  const targetUrl = options?.url ?? MESH_SPEC_URL;
  const schemaDirectives = getDirectiveExtensions(subgraph) || {};
  const linkDirectives = (schemaDirectives.link ||= []);
  // Always match the target URL exactly so core imports (`@transport`, `@merge`, …)
  // do not get folded into a protocol `@link` (e.g. `sql/v0.1`).
  let importStatement = linkDirectives.find(
    linkDirectiveArgs => linkDirectiveArgs.url === targetUrl,
  );
  if (!importStatement) {
    importStatement = {
      url: targetUrl,
      import: [],
    };
    linkDirectives.push(importStatement);
  }
  const existingImports: MeshDirectiveImport[] = [...(importStatement.import || [])];
  for (const directive of directives) {
    if (!existingImports.some(existing => meshDirectiveImportsEqual(existing, directive))) {
      existingImports.push(directive);
    }
  }
  importStatement.import = existingImports;
  const composeDirectives = (schemaDirectives.composeDirective = schemaDirectives.composeDirective
    ? schemaDirectives.composeDirective.filter(Boolean)
    : []);
  for (const directive of directives) {
    const localName = meshDirectiveImportKey(directive);
    if (!composeDirectives.some(dir => dir.name === localName)) {
      composeDirectives.push({
        name: localName,
      });
    }
  }
  patchSchemaDirectiveExtensions(subgraph, {
    link: linkDirectives,
    composeDirective: composeDirectives,
  });
  subgraph = importFederationDirectives(subgraph, ['@composeDirective']);
  return subgraph;
}

const FEDERATION_V1_DIRECTIVES = [
  '@key',
  '@provides',
  '@requires',
  '@external',
  '@inaccessible',
  '@shareable',
  '@extends',
  '@tag',
];

/** Federation v1 directive names imported when converting a subgraph to Federation v2. */
export { FEDERATION_V1_DIRECTIVES };

/**
 * Assert a Mesh `@link` spec is present / supported on `schema` (reads `@link` via
 * `getDirectiveExtensions`). Used by transports and Compose when reading subgraphs.
 */
export function assertSupportedMeshSpecOnSchema(
  schema: GraphQLSchema,
  options: Omit<AssertSupportedMeshSpecOptions, 'links'>,
): ParsedMeshSpecUrl | undefined {
  const links = getDirectiveExtensions(schema)?.link as AssertSupportedMeshSpecOptions['links'];
  return assertSupportedMeshSpec({ ...options, links });
}
