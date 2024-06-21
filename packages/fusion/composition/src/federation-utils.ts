import { getDirectiveExtensions } from "@graphql-mesh/utils";
import { MapperKind, getRootTypeNames, getRootTypes, mapSchema, printSchemaWithDirectives } from "@graphql-tools/utils";
import { isSpecifiedDirective, type GraphQLField, type GraphQLSchema } from "graphql";

export function addFederation2DirectivesToSubgraph(
  subgraph: GraphQLSchema,
) {
  const schemaDirectives = getDirectiveExtensions(subgraph);
  const linkDirectives = schemaDirectives.link ||= [];
  if (!linkDirectives.some(linkDirectiveArgs => linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/link/'))) {
    linkDirectives.push({
      url: "https://specs.apollo.dev/link/v1.0"
    });
  }
  if (!linkDirectives.some(linkDirectiveArgs => linkDirectiveArgs.url?.startsWith("https://specs.apollo.dev/federation/"))) {
    linkDirectives.push({
      url: "https://specs.apollo.dev/federation/v2.3",
      import: [],
    });
  }
  const extensions: Record<string, unknown> = subgraph.extensions ||= {};
  extensions.directives = schemaDirectives;
  return subgraph;
}

export function importFederationDirectives(subgraph: GraphQLSchema, directives: string[]) {
  const schemaDirectives = getDirectiveExtensions(subgraph);
  const linkDirectives = schemaDirectives.link ||= [];
  let importStatement = linkDirectives.find(linkDirectiveArgs => linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/federation/'))
  if (!importStatement) {
    importStatement = {
      url: "https://specs.apollo.dev/federation/v2.3",
      import: [],
    };
    linkDirectives.push(importStatement);
  }
  importStatement.import = [...new Set([...(importStatement.import || []), ...directives])];
  const extensions: Record<string, unknown> = subgraph.extensions ||= {};
  extensions.directives = schemaDirectives;
  return subgraph;
}

export function importMeshDirectives(subgraph: GraphQLSchema, directives: string[]) {
  const schemaDirectives = getDirectiveExtensions(subgraph);
  const linkDirectives = schemaDirectives.link ||= [];
  let importStatement = linkDirectives.find(linkDirectiveArgs => linkDirectiveArgs.url?.startsWith('https://the-guild.dev/graphql/mesh/spec/'));
  if (!importStatement) {
    importStatement = {
      url: "https://the-guild.dev/graphql/mesh/spec/v1.0",
      import: [],
    };
    linkDirectives.push(importStatement);
  }3
  importStatement.import = [...new Set([...importStatement.import, ...directives])];
  subgraph = importFederationDirectives(subgraph, ['@composeDirective']);
  const composeDirectives = schemaDirectives.composeDirective ||= [];
  for (const directiveName of directives) {
    if (!composeDirectives.some(dir => dir.name === directiveName)) {
      composeDirectives.push({
        name: directiveName,
      });
    }
  }
  const extensions: Record<string, unknown> = subgraph.extensions ||= {};
  extensions.directives = schemaDirectives;
  return subgraph;
}

export function convertSubgraphToFederationv2(subgraph: GraphQLSchema) {
  const schemaDirectives = getDirectiveExtensions(subgraph);
  const linkDirectives = schemaDirectives.link ||= [];
  if (linkDirectives.some(linkDirectiveArgs => linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/link/'))) {
    // This is already v2, skipping
    return subgraph;
  }
  subgraph = addFederation2DirectivesToSubgraph(subgraph);
  const federationv1Directives = [
    '@key',
    '@provides',
    '@requires',
    '@external',
    '@inaccessible',
    '@shareable'
  ]
  const meshDirectives = new Set<string>();
  // Add @shareable
  subgraph = mapSchema(subgraph, {
    [MapperKind.OBJECT_TYPE]: type => {
      const typeDirectives = getDirectiveExtensions(type);
      typeDirectives.shareable ||= [];
      if (!typeDirectives.shareable?.length) {
        typeDirectives.shareable.push({});
      }
      const typeExtensions: Record<string, unknown> = type.extensions ||= {};
      typeExtensions.directives = typeDirectives;
      return type;
    },
    [MapperKind.DIRECTIVE]: directive => {
      if (!isSpecifiedDirective(directive)) {
        const directiveName = `@${directive.name}`
        if (!federationv1Directives.includes(directiveName)) {
          meshDirectives.add(directiveName);
          directive.isRepeatable = true;
        }
      }
      return directive;
    },
  });
  if (meshDirectives.size) {
    subgraph = importMeshDirectives(subgraph, Array.from(meshDirectives));
  }
  subgraph = importFederationDirectives(subgraph, federationv1Directives);
  return subgraph;
}

