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
      url: 'https://specs.apollo.dev/federation/v2.3',
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
  if (importStatement.url === 'https://specs.apollo.dev/federation/v2.0') {
    importStatement.url = 'https://specs.apollo.dev/federation/v2.6';
  }
  importStatement.import = [...new Set([...(importStatement.import || []), ...directives])];
  const extensions: Record<string, unknown> = (subgraph.extensions ||= {});
  extensions.directives = schemaDirectives;
  return subgraph;
}

export function importMeshDirectives(subgraph: GraphQLSchema, directives: string[]) {
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
  importStatement.import = [...new Set([...importStatement.import, ...directives])];
  const composeDirectives = (schemaDirectives.composeDirective = schemaDirectives.composeDirective
    ? schemaDirectives.composeDirective.filter(Boolean)
    : []);
  for (const directiveName of directives) {
    if (!composeDirectives.some(dir => dir.name === directiveName)) {
      composeDirectives.push({
        name: directiveName,
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

export function convertSubgraphToFederationv2(subgraph: GraphQLSchema) {
  const schemaDirectives = getDirectiveExtensions(subgraph);
  if (
    schemaDirectives?.link?.some(linkDirectiveArgs =>
      linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/'),
    )
  ) {
    // This is already v2, skipping
    return subgraph;
  }
  subgraph = addFederation2DirectivesToSubgraph(subgraph);
  // Add @shareable
  subgraph = mapSchema(subgraph, {
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
  subgraph = importFederationDirectives(subgraph, FEDERATION_V1_DIRECTIVES);
  return subgraph;
}
