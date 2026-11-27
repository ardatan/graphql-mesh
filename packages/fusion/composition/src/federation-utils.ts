import { GraphQLSchema, isSpecifiedDirective } from 'graphql';
import {
  addFederation2DirectivesToSubgraph,
  FEDERATION_V1_DIRECTIVES,
  importFederationDirectives,
  importMeshDirectives,
  MESH_CORE_DIRECTIVES,
  omitIntrospectionTypes,
} from '@graphql-mesh/utils';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';

export {
  addFederation2DirectivesToSubgraph,
  importFederationDirectives,
  importMeshDirectives,
  type MeshDirectiveImport,
} from '@graphql-mesh/utils';

/**
 * Directives that must never be auto-imported as Mesh compose features:
 * - GraphQL / Federation builtins
 * - Connectors `@connect` / SCHEMA `@source` (loaders keep defs for valid print;
 *   `@composeDirective(name: "@connect")` is Guild-only via
 *   `prepareConnectorsBeforeGuild`)
 * - Mesh core dirs (loaders / Compose stamp them via `importMeshDirectives`)
 */
const NEVER_AUTO_MESH_COMPOSE_DIRECTIVE = new Set<string>([
  ...FEDERATION_V1_DIRECTIVES,
  ...MESH_CORE_DIRECTIVES,
  '@link',
  '@composeDirective',
  '@stream',
  '@connect',
  '@source',
  '@meshSource',
]);

/**
 * Rebuild a schema while stamping directive extensions.
 * Uses `omitIntrospectionTypes` so GraphQL 17 `toConfig()` + dual-package
 * rebuilds do not throw `multiple types named "__Schema"`.
 */
export function normalizeDirectiveExtensions(subgraph: GraphQLSchema) {
  const config = subgraph.toConfig();
  return new GraphQLSchema({
    ...config,
    types: omitIntrospectionTypes(config.types),
    extensions: {
      ...subgraph.extensions,
      directives: getDirectiveExtensions(subgraph),
    },
    astNode: undefined,
    extensionASTNodes: undefined,
  });
}

/**
 * Stamp object-level `@shareable` for value-type / multi-subgraph field merge.
 * Never leave `@shareable` on interfaces. (Entities with `@key` still need
 * type-level `@shareable` when the same fields are resolved from multiple
 * subgraphs - Hive Composition errors otherwise.)
 * Skip Subscription roots only: Hive Composition rejects shareable on
 * subscription fields, while Query / Mutation type-level `@shareable` is still
 * required so overlapping root fields (semantic-convention `@merge` entry
 * points) can compose.
 */
function ensureObjectTypesShareable(subgraph: GraphQLSchema) {
  const subscriptionTypeName = subgraph.getSubscriptionType()?.name;
  return mapSchema(subgraph, {
    [MapperKind.OBJECT_TYPE]: type => {
      if (subscriptionTypeName && type.name === subscriptionTypeName) {
        return type;
      }
      const typeDirectives = getDirectiveExtensions(type);
      // Prefer mutating extensions in place - recreating GraphQLObjectType breaks
      // interface identity (OpenAPI HATEOAS / federation-mixed e2es). Clone the
      // directives bag so a shared interface/object bag cannot get `@shareable`
      // stamped onto an INTERFACE (invalid in Federation).
      typeDirectives.shareable ||= [];
      if (!typeDirectives.shareable?.length) {
        const typeExtensions: Record<string, any> = (type.extensions ||= {});
        typeExtensions.directives = { ...typeDirectives, shareable: [{}] };
      }
      return type;
    },
    [MapperKind.INTERFACE_TYPE]: type => {
      const dirs =
        ((type?.extensions as any)?.directives as Record<string, unknown> | undefined) ||
        getDirectiveExtensions(type);
      if (dirs?.shareable) {
        const typeExtensions: Record<string, any> = (type.extensions ||= {});
        const cloned = { ...dirs };
        delete cloned.shareable;
        typeExtensions.directives = cloned;
      }
      return type;
    },
  });
}

/** Collect Fed v1 directive names actually used on the subgraph (plus `@shareable`). */
function usedFederationDirectiveImports(subgraph: GraphQLSchema): string[] {
  const used = new Set<string>(['@shareable']);
  const consider = (dirs: Record<string, unknown> | undefined) => {
    if (!dirs) return;
    for (const name of Object.keys(dirs)) {
      const asImport = name.startsWith('@') ? name : `@${name}`;
      if ((FEDERATION_V1_DIRECTIVES as readonly string[]).includes(asImport)) {
        used.add(asImport);
      }
    }
  };
  consider(getDirectiveExtensions(subgraph));
  mapSchema(subgraph, {
    [MapperKind.TYPE]: type => {
      consider(getDirectiveExtensions(type));
      return type;
    },
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      consider(getDirectiveExtensions(fieldConfig));
      return fieldConfig;
    },
    [MapperKind.INTERFACE_FIELD]: fieldConfig => {
      consider(getDirectiveExtensions(fieldConfig));
      return fieldConfig;
    },
    [MapperKind.ARGUMENT]: argConfig => {
      consider(getDirectiveExtensions(argConfig));
      return argConfig;
    },
    [MapperKind.ENUM_VALUE]: enumValueConfig => {
      consider(getDirectiveExtensions(enumValueConfig));
      return enumValueConfig;
    },
    [MapperKind.INPUT_OBJECT_FIELD]: inputFieldConfig => {
      consider(getDirectiveExtensions(inputFieldConfig));
      return inputFieldConfig;
    },
  });
  return [...used];
}

/**
 * Import leftover custom directives under Mesh `core/v0.1` + `@composeDirective`
 * so Guild composition keeps them (core-feature members) and Apollo Fed
 * compatibility `@custom` gets `@composeDirective`. Connectors stay excluded.
 */
export function importCustomDirectivesForComposition(subgraph: GraphQLSchema) {
  const schemaDirectives = getDirectiveExtensions(subgraph) || {};
  const alreadyImported = new Set<string>();
  for (const link of schemaDirectives.link || []) {
    if (!Array.isArray(link?.import)) continue;
    for (const item of link.import) {
      if (typeof item === 'string') {
        alreadyImported.add(item);
      } else if (item && typeof item === 'object' && 'name' in item) {
        const local =
          (item as { as?: string; name?: string }).as || (item as { name?: string }).name;
        if (local) alreadyImported.add(local);
      }
    }
  }
  for (const d of schemaDirectives.composeDirective || []) {
    if (typeof d?.name === 'string') alreadyImported.add(d.name);
  }

  const federationNamespacePrefixes = (schemaDirectives.link || [])
    .filter(link => link?.url?.startsWith('https://specs.apollo.dev/federation/'))
    .map(link => `@${link.as || 'federation'}__`);
  const toImport: string[] = [];
  for (const directive of subgraph.getDirectives()) {
    if (isSpecifiedDirective(directive)) {
      continue;
    }
    const name = `@${directive.name}`;
    if (
      NEVER_AUTO_MESH_COMPOSE_DIRECTIVE.has(name) ||
      name.startsWith('@federation__') ||
      federationNamespacePrefixes.some(prefix => name.startsWith(prefix)) ||
      name.startsWith('@join__') ||
      alreadyImported.has(name)
    ) {
      continue;
    }
    toImport.push(name);
  }
  if (!toImport.length) {
    return subgraph;
  }
  return importMeshDirectives(subgraph, toImport);
}

export interface ConvertSubgraphToFederationv2Options {
  /**
   * When true, the **input** subgraph already declared a Federation `@link`
   * (before Mesh transforms). Skip object-level `@shareable` so explicit
   * field-ownership rules stay intact. Transforms such as encapsulate may
   * import `@inaccessible` via Fed `@link` before this runs - that must not
   * count as an explicit user link (pass the pre-transform snapshot here).
   */
  hadExplicitFederationLink?: boolean;
}

/**
 * Ensure the subgraph is Federation v2-ready for Guild composition.
 *
 * - Missing federation `@link` → stamp Fed v2.6
 * - Object types without `@key` get `@shareable` (value-type merge), unless the
 *   input already had an explicit Federation `@link`
 * - Import only federation directives that are actually used (+ `@shareable`)
 * - Custom non-Mesh directives → Mesh `@link` + `@composeDirective` (Guild + Apollo Fed)
 */
export function convertSubgraphToFederationv2(
  subgraph: GraphQLSchema,
  opts: ConvertSubgraphToFederationv2Options = {},
) {
  const schemaDirectives = getDirectiveExtensions(subgraph);
  // Only treat as "already v2" when Federation itself is linked. Federation Connectors
  // `@link` also uses specs.apollo.dev but does not imply `@shareable`.
  const hasFederationLink = schemaDirectives?.link?.some(linkDirectiveArgs =>
    linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/federation/'),
  );
  if (!hasFederationLink) {
    subgraph = addFederation2DirectivesToSubgraph(subgraph);
  }
  // Object-level `@shareable` only for Mesh-owned Fed readiness - not when the
  // caller already linked Federation (preserves field-ownership rules).
  if (!opts.hadExplicitFederationLink) {
    subgraph = ensureObjectTypesShareable(subgraph);
  }
  subgraph = importFederationDirectives(subgraph, usedFederationDirectiveImports(subgraph));
  subgraph = importCustomDirectivesForComposition(subgraph);
  return subgraph;
}
