import { GraphQLSchema } from 'graphql';
import {
  addFederation2DirectivesToSubgraph,
  FEDERATION_V1_DIRECTIVES,
  importFederationDirectives,
} from '@graphql-mesh/utils';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';

export {
  addConnectComposeDirective,
  addFederation2DirectivesToSubgraph,
  importFederationDirectives,
  importMeshDirectives,
  type MeshDirectiveImport,
} from '@graphql-mesh/utils';

export function normalizeDirectiveExtensions(subgraph: GraphQLSchema) {
  return new GraphQLSchema({
    ...subgraph.toConfig(),
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
 * subgraphs — Guild composition errors otherwise.)
 */
function ensureObjectTypesShareable(subgraph: GraphQLSchema) {
  return mapSchema(subgraph, {
    [MapperKind.OBJECT_TYPE]: type => {
      const typeDirectives = getDirectiveExtensions(type);
      // Prefer mutating extensions in place — recreating GraphQLObjectType breaks
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
  });
  return [...used];
}

/**
 * Ensure the subgraph is Federation v2-ready for Guild composition.
 *
 * - Missing federation `@link` → stamp Fed v2.6
 * - Object types without `@key` get `@shareable` (value-type merge)
 * - Import only federation directives that are actually used (+ `@shareable`)
 */
export function convertSubgraphToFederationv2(subgraph: GraphQLSchema) {
  const schemaDirectives = getDirectiveExtensions(subgraph);
  // Only treat as "already v2" when Federation itself is linked. Federation Connectors
  // `@link` also uses specs.apollo.dev but does not imply `@shareable`.
  const hasFederationLink = schemaDirectives?.link?.some(linkDirectiveArgs =>
    linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/federation/'),
  );
  if (!hasFederationLink) {
    subgraph = addFederation2DirectivesToSubgraph(subgraph);
  }
  subgraph = ensureObjectTypesShareable(subgraph);
  subgraph = importFederationDirectives(subgraph, usedFederationDirectiveImports(subgraph));
  return subgraph;
}
