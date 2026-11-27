import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLSchema,
} from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import { importFederationDirectives } from './federation-ready.js';

/**
 * SDL for GraphQL Federation Spec draft entity-lookup directives.
 *
 * Source of truth:
 * https://graphql.github.io/graphql-federation-spec/draft
 *
 * GraphQL.js defs are vendored verbatim from that draft. Mesh still links
 * `https://specs.apollo.dev/federation/v2.6` for `@key` / `@shareable` / etc.
 * (Guild composition does not yet accept Apollo federation `@link` v3.0, where
 * Apollo also publishes these elements). Imports use
 * {@link FEDERATION_SPEC_LOOKUP_LINK_URL} so composition treats them as members
 * of the official Federation Spec feature, not Mesh `core`.
 */
export const FEDERATION_LOOKUP_DIRECTIVES_SDL = /* GraphQL */ `
  scalar FieldSelectionMap

  directive @lookup on FIELD_DEFINITION

  directive @is(field: FieldSelectionMap!) on ARGUMENT_DEFINITION

  directive @internal on OBJECT | FIELD_DEFINITION
`;

/**
 * Official GraphQL Federation Spec `@link` URL for `@lookup` / `@is` / `@internal`.
 * Do not use `specs.graphql-mesh.dev` for these (not Mesh-owned).
 * Rover requires the last path segment to start with `v`; content matches the
 * draft at https://graphql.github.io/graphql-federation-spec/draft
 */
export const FEDERATION_SPEC_LOOKUP_LINK_URL =
  'https://graphql.github.io/graphql-federation-spec/v0.0';

/** Federation Spec draft `FieldSelectionMap` scalar (selection-map strings). */
export const FieldSelectionMapScalar = new GraphQLScalarType({
  name: 'FieldSelectionMap',
});

/**
 * Marks a Query-reachable entity entry field that returns one object (not a
 * list) for stable-key recall (Federation Spec draft `@lookup`).
 * @see https://graphql.github.io/graphql-federation-spec/draft
 */
export const LookupDirective = new GraphQLDirective({
  name: 'lookup',
  locations: [DirectiveLocation.FIELD_DEFINITION],
});

/**
 * Maps a lookup argument onto an entity field path when names differ.
 * @see https://graphql.github.io/graphql-federation-spec/draft
 */
export const IsDirective = new GraphQLDirective({
  name: 'is',
  locations: [DirectiveLocation.ARGUMENT_DEFINITION],
  args: {
    field: {
      type: new GraphQLNonNull(FieldSelectionMapScalar),
    },
  },
});

/**
 * Hides lookup-only types/fields from the client-facing composite schema.
 * Effect is local to the source schema (unlike `@inaccessible`).
 * @see https://graphql.github.io/graphql-federation-spec/draft
 */
export const InternalDirective = new GraphQLDirective({
  name: 'internal',
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.FIELD_DEFINITION],
});

export const FEDERATION_LOOKUP_DIRECTIVES = [
  LookupDirective,
  IsDirective,
  InternalDirective,
] as const;

export const FEDERATION_LOOKUP_DIRECTIVE_IMPORTS = ['@lookup', '@is', '@internal'] as const;

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

/**
 * Ensure GraphQL.js directive defs exist for federation-spec lookup directives,
 * `@link` them under {@link FEDERATION_SPEC_LOOKUP_LINK_URL} (Guild core-feature
 * membership), and register `@composeDirective` so composition keeps apps.
 */
export function importFederationLookupDirectives(
  subgraph: GraphQLSchema,
  directives: readonly string[] = FEDERATION_LOOKUP_DIRECTIVE_IMPORTS,
): GraphQLSchema {
  const wanted = new Set(directives.map(d => (d.startsWith('@') ? d.slice(1) : d)).filter(Boolean));
  if (!wanted.size) {
    return subgraph;
  }

  const config = subgraph.toConfig();
  const existingNames = new Set(config.directives.map(d => d.name));
  const types = [...config.types];
  if (wanted.has('is') && !types.some(t => t.name === 'FieldSelectionMap')) {
    types.push(FieldSelectionMapScalar);
  }
  const toAdd: GraphQLDirective[] = [];
  if (wanted.has('lookup') && !existingNames.has('lookup')) {
    toAdd.push(LookupDirective);
  }
  if (wanted.has('is') && !existingNames.has('is')) {
    toAdd.push(IsDirective);
  }
  if (wanted.has('internal') && !existingNames.has('internal')) {
    toAdd.push(InternalDirective);
  }
  if (toAdd.length) {
    subgraph = new GraphQLSchema({
      ...config,
      types,
      directives: [...config.directives, ...toAdd],
    });
  }

  const schemaDirectives = getDirectiveExtensions(subgraph) || {};
  const linkDirectives = (schemaDirectives.link ||= []);
  let importStatement = linkDirectives.find(
    (link: { url?: string }) => link?.url === FEDERATION_SPEC_LOOKUP_LINK_URL,
  );
  if (!importStatement) {
    importStatement = {
      url: FEDERATION_SPEC_LOOKUP_LINK_URL,
      import: [],
    };
    linkDirectives.push(importStatement);
  }
  const existingImports: string[] = [...(importStatement.import || [])];
  for (const name of wanted) {
    const asImport = `@${name}`;
    if (!existingImports.includes(asImport)) {
      existingImports.push(asImport);
    }
  }
  importStatement.import = existingImports;

  const composeDirectives = (schemaDirectives.composeDirective = schemaDirectives.composeDirective
    ? schemaDirectives.composeDirective.filter(Boolean)
    : []);
  for (const name of wanted) {
    const localName = `@${name}`;
    if (!composeDirectives.some(dir => dir.name === localName)) {
      composeDirectives.push({ name: localName });
    }
  }
  patchSchemaDirectiveExtensions(subgraph, {
    link: linkDirectives,
    composeDirective: composeDirectives,
  });
  return importFederationDirectives(subgraph, ['@composeDirective']);
}

/**
 * Detect whether a selection-map string is a plain field path (no args),
 * as required by the Federation Spec draft for `@is(field:)`.
 */
export function isPlainFieldSelectionMap(field: string): boolean {
  const trimmed = field.trim();
  if (!trimmed) {
    return false;
  }
  // Reject obvious arg applications: `foo(bar: 1)`, nested with `(`.
  if (trimmed.includes('(') || trimmed.includes(')')) {
    return false;
  }
  // Allow simple paths `id`, `address.id`, and oneOf object maps `{ id } | { name }`.
  // Full FieldSelectionMap grammar is richer; this is the Mesh compose DX slice.
  return true;
}

/**
 * Resolve the entity key field path for a lookup argument.
 * Prefer `@is(field:)`; otherwise the argument name must match a return-type field.
 */
export function resolveLookupKeyField(
  argName: string,
  isDirectives: Array<{ field?: string }> | undefined,
): string {
  const fromIs = isDirectives?.find(d => typeof d?.field === 'string')?.field;
  if (typeof fromIs === 'string' && fromIs.trim()) {
    return fromIs.trim();
  }
  return argName;
}
