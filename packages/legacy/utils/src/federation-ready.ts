import { GraphQLSchema } from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import { isMeshSpecLinkUrl, MESH_SPEC_URL } from './mesh-spec.js';

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

function meshDirectiveImportsEqual(a: unknown, b: MeshDirectiveImport): boolean {
  if (typeof b === 'string') {
    if (typeof a === 'string') {
      return a === b;
    }
    if (a && typeof a === 'object' && 'name' in (a as object)) {
      const obj = a as { name?: string; as?: string };
      return obj.name === b || obj.as === b;
    }
    return false;
  }
  if (typeof a === 'string') {
    return a === b.name || a === b.as;
  }
  if (a && typeof a === 'object' && 'name' in (a as object)) {
    const obj = a as { name?: string; as?: string };
    return obj.name === b.name && (obj.as || undefined) === (b.as || undefined);
  }
  return false;
}

/**
 * Import Mesh-spec directives (optionally aliased, e.g. `{ name: '@source', as: '@meshSource' }`)
 * and register them with `@composeDirective` under the *local* name.
 *
 * Loaders call this with the directives they emit — there is no auto-scan helper.
 */
export function importMeshDirectives(subgraph: GraphQLSchema, directives: MeshDirectiveImport[]) {
  const schemaDirectives = getDirectiveExtensions(subgraph) || {};
  const linkDirectives = (schemaDirectives.link ||= []);
  let importStatement = linkDirectives.find(linkDirectiveArgs =>
    isMeshSpecLinkUrl(linkDirectiveArgs.url),
  );
  if (!importStatement) {
    importStatement = {
      url: MESH_SPEC_URL,
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

function schemaHasConnectorsLink(subgraph: GraphQLSchema): boolean {
  const directives = getDirectiveExtensions(subgraph);
  const links = directives?.link || [];
  if (
    links.some(
      (link: { url?: string }) =>
        typeof link?.url === 'string' && link.url.startsWith('https://specs.apollo.dev/connect'),
    )
  ) {
    return true;
  }
  const sources = directives?.source || [];
  return sources.some((source: { http?: { baseURL?: string } }) => source?.http?.baseURL != null);
}

/**
 * Register `@composeDirective(name: "@connect")` when the subgraph already links the
 * Federation Connectors spec. Idempotent.
 */
export function addConnectComposeDirective(subgraph: GraphQLSchema): GraphQLSchema {
  if (!schemaHasConnectorsLink(subgraph)) {
    return subgraph;
  }
  const schemaDirectives = getDirectiveExtensions(subgraph) || {};
  const composeDirectives = (schemaDirectives.composeDirective =
    schemaDirectives.composeDirective?.filter(Boolean) || []);
  if (!composeDirectives.some((dir: { name?: string }) => dir.name === '@connect')) {
    composeDirectives.push({ name: '@connect' });
  }
  patchSchemaDirectiveExtensions(subgraph, {
    composeDirective: composeDirectives,
  });
  return importFederationDirectives(subgraph, ['@composeDirective']);
}
