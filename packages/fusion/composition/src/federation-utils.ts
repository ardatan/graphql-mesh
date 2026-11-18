import { GraphQLSchema } from 'graphql';
import {
  addFederation2DirectivesToSubgraph,
  FEDERATION_V1_DIRECTIVES,
  importFederationDirectives,
} from '@graphql-mesh/utils';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';

export {
  addFederation2DirectivesToSubgraph,
  detectAndAddMeshDirectives,
  ensureFederationReadySubgraph,
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

export function convertSubgraphToFederationv2(subgraph: GraphQLSchema) {
  const schemaDirectives = getDirectiveExtensions(subgraph);
  // Only treat as "already v2" when Federation itself is linked. Federation Connectors
  // `@link` also uses specs.apollo.dev but does not imply `@shareable`.
  // Encapsulate may import federation early for `@inaccessible` — still ensure shareable.
  const hasFederationLink = schemaDirectives?.link?.some(linkDirectiveArgs =>
    linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/federation/'),
  );
  if (hasFederationLink) {
    subgraph = ensureObjectTypesShareable(subgraph);
    subgraph = importFederationDirectives(subgraph, FEDERATION_V1_DIRECTIVES);
    return subgraph;
  }
  subgraph = addFederation2DirectivesToSubgraph(subgraph);
  subgraph = ensureObjectTypesShareable(subgraph);
  subgraph = importFederationDirectives(subgraph, FEDERATION_V1_DIRECTIVES);
  return subgraph;
}
