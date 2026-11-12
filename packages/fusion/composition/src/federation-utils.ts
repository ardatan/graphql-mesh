import { GraphQLDirective, GraphQLSchema, isSpecifiedDirective } from 'graphql';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';

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
  const extensions: Record<string, unknown> = (subgraph.extensions ||= {});
  extensions.directives = schemaDirectives;
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
  const extensions: Record<string, unknown> = (subgraph.extensions ||= {});
  extensions.directives = schemaDirectives;
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
 */
export function importMeshDirectives(subgraph: GraphQLSchema, directives: MeshDirectiveImport[]) {
  const schemaDirectives = getDirectiveExtensions(subgraph) || {};
  const linkDirectives = (schemaDirectives.link ||= []);
  let importStatement = linkDirectives.find(linkDirectiveArgs =>
    linkDirectiveArgs.url?.startsWith('https://the-guild.dev/graphql/mesh/spec/'),
  );
  if (!importStatement) {
    importStatement = {
      url: 'https://the-guild.dev/graphql/mesh/spec/v1.0',
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
  const extensions: Record<string, unknown> = (subgraph.extensions ||= {});
  extensions.directives = schemaDirectives;
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

export function detectAndAddMeshDirectives(subgraph: GraphQLSchema) {
  const meshDirectives: string[] = [];
  const existingAdditionalDirectives: string[] = [];
  const existingDirectiveExtensionsOnSchema = getDirectiveExtensions(subgraph);
  if (existingDirectiveExtensionsOnSchema?.link) {
    const linkDirectives = existingDirectiveExtensionsOnSchema.link;
    for (const linkDirective of linkDirectives) {
      if (
        linkDirective.url != null &&
        !linkDirective.url.startsWith('https://the-guild.dev/graphql/mesh/spec/')
      ) {
        if (linkDirective.import) {
          existingAdditionalDirectives.push(...linkDirective.import);
        }
      }
    }
  }
  subgraph = mapSchema(subgraph, {
    [MapperKind.DIRECTIVE]: directive => {
      const directiveName = `@${directive.name}`;
      if (
        !isSpecifiedDirective(directive) &&
        !FEDERATION_V1_DIRECTIVES.includes(directiveName) &&
        !directiveName.startsWith('@federation__') &&
        directiveName !== '@stream' &&
        directiveName !== '@link' &&
        !existingAdditionalDirectives.includes(directiveName)
      ) {
        meshDirectives.push(directiveName);
        if (!directive.isRepeatable && directive.args.some(arg => arg.name === 'subgraph')) {
          return new GraphQLDirective({
            ...directive.toConfig(),
            isRepeatable: true,
          });
        }
      }
      return directive;
    },
  });
  if (meshDirectives.length > 0) {
    subgraph = importMeshDirectives(subgraph, meshDirectives);
  }
  return subgraph;
}

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
      typeDirectives.shareable ||= [];
      if (!typeDirectives.shareable?.length) {
        const typeExtensions: Record<string, any> = (type.extensions ||= {});
        typeExtensions.directives ||= {};
        typeExtensions.directives.shareable = [{}];
      }
      return type;
    },
    [MapperKind.INTERFACE_TYPE]: type => {
      if ((type?.extensions?.directives as any)?.shareable) {
        delete (type.extensions.directives as any).shareable;
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
