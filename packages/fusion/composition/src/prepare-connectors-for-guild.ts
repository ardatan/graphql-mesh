import type { ConstDirectiveNode, DocumentNode } from 'graphql';
import { GraphQLObjectType, GraphQLSchema, GraphQLString, Kind, parse, visit } from 'graphql';
import {
  ConnectDirective,
  ConnectHTTPInput,
  ConnectorErrorsInput,
  HTTPHeaderMappingInput,
  JSONSelectionScalar,
  SourceDirective,
  SourceHTTPInput,
  URLPathTemplateScalar,
} from '@graphql-mesh/transport-connect';
import { getDocumentNodeFromSchema } from '@graphql-tools/utils';
import type { ServiceDefinition } from '@theguild/federation-composition';

/**
 * Guild federation composition does not preserve `@connect` like Apollo.
 * Mesh Compose, **immediately before** `composeServices`, ensures each
 * Connectors subgraph has:
 * - `directive @connect(...)` (+ input/scalar deps) — loaders usually already
 *   register these for GraphQL.js-valid printed schemas; stamp if missing
 * - `@composeDirective(name: "@connect")` + federation `@link` import
 *
 * `@composeDirective` is Guild-only. Final supergraph drops native connect
 * via `finalizeConnectorsSupergraph` → `@join__directive`.
 */
export function prepareConnectorsBeforeGuild(
  annotatedSubgraphs: ServiceDefinition[],
): ServiceDefinition[] {
  const connectSupportDefs = getConnectSupportDefinitions();

  return annotatedSubgraphs.map(subgraph => {
    const doc =
      typeof subgraph.typeDefs === 'string'
        ? parse(subgraph.typeDefs, { noLocation: true })
        : subgraph.typeDefs;

    if (!documentNeedsConnectCompose(doc)) {
      return subgraph;
    }

    const existingDefNames = new Set<string>();
    visit(doc, {
      DirectiveDefinition(node) {
        existingDefNames.add(node.name.value);
      },
      InputObjectTypeDefinition(node) {
        existingDefNames.add(node.name.value);
      },
      ScalarTypeDefinition(node) {
        existingDefNames.add(node.name.value);
      },
    });

    const extras = connectSupportDefs.filter(def => {
      if (
        def.kind === Kind.DIRECTIVE_DEFINITION ||
        def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION ||
        def.kind === Kind.SCALAR_TYPE_DEFINITION
      ) {
        return !existingDefNames.has(def.name.value);
      }
      return false;
    });

    // Guild counts federation `@link` across all schema nodes — add it at most once.
    let documentHasFedLink = false;
    visit(doc, {
      SchemaDefinition(node) {
        if (schemaNodeHasFederationLink(node.directives)) {
          documentHasFedLink = true;
        }
      },
      SchemaExtension(node) {
        if (schemaNodeHasFederationLink(node.directives)) {
          documentHasFedLink = true;
        }
      },
    });
    let fedLinkAdded = documentHasFedLink;

    let schemaTouched = false;
    const nextDoc = visit(doc, {
      SchemaDefinition(node) {
        schemaTouched = true;
        const addFed = !fedLinkAdded;
        if (addFed) {
          fedLinkAdded = true;
        }
        return {
          ...node,
          directives: ensureConnectComposeDirectives(node.directives, {
            addFederationLink: addFed,
          }),
        };
      },
      SchemaExtension(node) {
        schemaTouched = true;
        const addFed = !fedLinkAdded;
        if (addFed) {
          fedLinkAdded = true;
        }
        return {
          ...node,
          directives: ensureConnectComposeDirectives(node.directives, {
            addFederationLink: addFed,
          }),
        };
      },
    });

    let definitions = [...nextDoc.definitions, ...extras];
    if (!schemaTouched) {
      // Prefer a schema *extension* so implicit Mutation/Subscription roots stay
      // visible to Guild (an explicit `schema { query: Query }` would drop them).
      definitions = [
        {
          kind: Kind.SCHEMA_EXTENSION,
          directives: ensureConnectComposeDirectives(undefined, {
            addFederationLink: !fedLinkAdded,
          }),
        },
        ...definitions,
      ];
    }

    return {
      ...subgraph,
      typeDefs: { kind: Kind.DOCUMENT, definitions },
    };
  });
}

let cachedConnectSupportDefs: DocumentNode['definitions'] | undefined;

function getConnectSupportDefinitions(): DocumentNode['definitions'] {
  if (cachedConnectSupportDefs) {
    return cachedConnectSupportDefs;
  }
  // Minimal schema so we can print the Connectors directive + input/scalar deps.
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({ name: 'Query', fields: { _empty: { type: GraphQLString } } }),
    directives: [ConnectDirective, SourceDirective],
    types: [
      JSONSelectionScalar,
      URLPathTemplateScalar,
      ConnectHTTPInput,
      SourceHTTPInput,
      ConnectorErrorsInput,
      HTTPHeaderMappingInput,
    ],
  });
  const doc = getDocumentNodeFromSchema(schema);
  cachedConnectSupportDefs = doc.definitions.filter(
    def =>
      (def.kind === Kind.DIRECTIVE_DEFINITION &&
        (def.name.value === 'connect' || def.name.value === 'source')) ||
      (def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION &&
        (def.name.value === 'ConnectHTTP' ||
          def.name.value === 'SourceHTTP' ||
          def.name.value === 'ConnectorErrors' ||
          def.name.value === 'HTTPHeaderMapping')) ||
      (def.kind === Kind.SCALAR_TYPE_DEFINITION &&
        (def.name.value === 'JSONSelection' || def.name.value === 'URLPathTemplate')),
  );
  return cachedConnectSupportDefs;
}

function documentNeedsConnectCompose(doc: DocumentNode): boolean {
  let needs = false;
  visit(doc, {
    Directive(node) {
      if (node.name.value === 'connect') needs = true;
    },
    SchemaDefinition(node) {
      for (const dir of node.directives || []) {
        if (dir.name.value === 'link') {
          const url = getStringArg(dir, 'url');
          if (url?.startsWith('https://specs.apollo.dev/connect')) needs = true;
        }
        if (dir.name.value === 'source' && hasHttpArg(dir)) needs = true;
      }
    },
    SchemaExtension(node) {
      for (const dir of node.directives || []) {
        if (dir.name.value === 'link') {
          const url = getStringArg(dir, 'url');
          if (url?.startsWith('https://specs.apollo.dev/connect')) needs = true;
        }
        if (dir.name.value === 'source' && hasHttpArg(dir)) needs = true;
      }
    },
  });
  return needs;
}

function hasHttpArg(directive: ConstDirectiveNode): boolean {
  return (directive.arguments || []).some(a => a.name.value === 'http');
}

function schemaNodeHasFederationLink(
  directives: readonly ConstDirectiveNode[] | undefined,
): boolean {
  return (directives || []).some(
    d =>
      d.name.value === 'link' &&
      (getStringArg(d, 'url') || '').startsWith('https://specs.apollo.dev/federation/'),
  );
}

function ensureConnectComposeDirectives(
  directives: readonly ConstDirectiveNode[] | undefined,
  opts: { addFederationLink: boolean },
): ConstDirectiveNode[] {
  const next = [...(directives || [])];
  const hasComposeConnect = next.some(
    d => d.name.value === 'composeDirective' && getStringArg(d, 'name') === '@connect',
  );
  if (!hasComposeConnect) {
    next.push({
      kind: Kind.DIRECTIVE,
      name: { kind: Kind.NAME, value: 'composeDirective' },
      arguments: [
        {
          kind: Kind.ARGUMENT,
          name: { kind: Kind.NAME, value: 'name' },
          value: { kind: Kind.STRING, value: '@connect' },
        },
      ],
    });
  }

  const fedIdx = next.findIndex(
    d =>
      d.name.value === 'link' &&
      (getStringArg(d, 'url') || '').startsWith('https://specs.apollo.dev/federation/'),
  );
  if (fedIdx < 0) {
    if (!opts.addFederationLink) {
      return next;
    }
    next.push({
      kind: Kind.DIRECTIVE,
      name: { kind: Kind.NAME, value: 'link' },
      arguments: [
        {
          kind: Kind.ARGUMENT,
          name: { kind: Kind.NAME, value: 'url' },
          value: { kind: Kind.STRING, value: 'https://specs.apollo.dev/federation/v2.6' },
        },
        {
          kind: Kind.ARGUMENT,
          name: { kind: Kind.NAME, value: 'import' },
          value: {
            kind: Kind.LIST,
            values: [{ kind: Kind.STRING, value: '@composeDirective' }],
          },
        },
      ],
    });
    return next;
  }

  const fed = next[fedIdx];
  const importArg = fed.arguments?.find(a => a.name.value === 'import');
  if (!importArg) {
    next[fedIdx] = {
      ...fed,
      arguments: [
        ...(fed.arguments || []),
        {
          kind: Kind.ARGUMENT,
          name: { kind: Kind.NAME, value: 'import' },
          value: {
            kind: Kind.LIST,
            values: [{ kind: Kind.STRING, value: '@composeDirective' }],
          },
        },
      ],
    };
    return next;
  }

  // GraphQL list inputs may be a singleton value (`import: "@key"`) — normalize
  // to a list so we append `@composeDirective` without dropping existing imports.
  const existingImportValues =
    importArg.value.kind === Kind.LIST ? [...importArg.value.values] : [importArg.value];
  const already = existingImportValues.some(
    v => v.kind === Kind.STRING && v.value === '@composeDirective',
  );
  if (!already) {
    next[fedIdx] = {
      ...fed,
      arguments: (fed.arguments || []).map(arg =>
        arg.name.value === 'import'
          ? {
              ...arg,
              value: {
                kind: Kind.LIST,
                values: [
                  ...existingImportValues,
                  { kind: Kind.STRING, value: '@composeDirective' },
                ],
              },
            }
          : arg,
      ),
    };
  } else if (importArg.value.kind !== Kind.LIST) {
    // Already has compose via singleton string — still normalize to a list.
    next[fedIdx] = {
      ...fed,
      arguments: (fed.arguments || []).map(arg =>
        arg.name.value === 'import'
          ? {
              ...arg,
              value: { kind: Kind.LIST, values: existingImportValues },
            }
          : arg,
      ),
    };
  }
  return next;
}

function getStringArg(directive: ConstDirectiveNode, name: string): string | undefined {
  const arg = directive.arguments?.find(a => a.name.value === name);
  if (arg?.value.kind === Kind.STRING) {
    return arg.value.value;
  }
  return undefined;
}
