import type {
  ConstArgumentNode,
  ConstDirectiveNode,
  ConstValueNode,
  DocumentNode,
  EnumTypeDefinitionNode,
} from 'graphql';
import { Kind, parse, print, visit } from 'graphql';
import { astFromValueUntyped } from '@graphql-tools/utils';

const CONNECT_SPEC = 'https://specs.apollo.dev/connect/v0.4';
const JOIN_V05 = 'https://specs.apollo.dev/join/v0.5';

const JOIN_DIRECTIVE_DEFS = /* GraphQL */ `
  directive @join__directive(
    graphs: [join__Graph!]
    name: String!
    args: join__DirectiveArguments
  ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION
  scalar join__DirectiveArguments
`;

const CONNECT_INPUT_TYPES = new Set([
  'ConnectHTTP',
  'SourceHTTP',
  'HTTPHeaderMapping',
  'ConnectorErrors',
  'BatchSettings',
]);

/**
 * Owned by `@link(url: connect/v0.4)` — must not remain as `scalar X @join__type`.
 * Prefix/rename transforms ignore these names (like String/ID), so only the exact
 * link scalars appear; application scalars such as `AuditJSONSelection` stay.
 */
function isConnectLinkedScalarName(name: string): boolean {
  return name === 'JSONSelection' || name === 'URLPathTemplate';
}

/**
 * Finalize a Mesh connectors supergraph into `@join__directive(name:
 * "connect"|"source")` form.
 *
 * Canonical SDL for connectors runtimes (Hive Gateway and Apollo Router).
 * Raw `@connect` / `@source` are rewritten to join metadata (Router rejects
 * them when the connect `@link` is `for: EXECUTION` without imports). Mesh
 * schema `@transport` is rewritten later by `finalizeMeshJoinDirectives`
 * (GM-41) to `@join__directive(name: "transport")`.
 */
export function finalizeConnectorsSupergraph(supergraphSdl: string): string {
  if (!supergraphSdl.includes('specs.apollo.dev/connect')) {
    return supergraphSdl;
  }
  // Already finalized (join__directive import lists still mention "@connect" as a string).
  if (!/@connect\s*\(/.test(supergraphSdl) && !/@source\s*\(/.test(supergraphSdl)) {
    return supergraphSdl;
  }

  const document = parse(supergraphSdl, { noLocation: true });
  const graphEnumToName = readJoinGraphMap(document);
  const nameToGraphEnum = new Map<string, string>();
  for (const [enumVal, name] of graphEnumToName) {
    nameToGraphEnum.set(name, enumVal);
  }
  const singleGraphEnum = graphEnumToName.size === 1 ? [...graphEnumToName.keys()][0] : undefined;

  const pendingSources: Array<Record<string, unknown>> = [];
  // Source name → every graph that referenced it via `@connect` (collision-safe).
  const sourceNameToGraphs = new Map<string, Set<string>>();
  const graphsWithConnect = new Set<string>();

  let nextDoc = visit(document, {
    SchemaDefinition(node) {
      return {
        ...node,
        directives: rewriteSchemaDirectivesForConnectors(node.directives, pendingSources),
      };
    },
    SchemaExtension(node) {
      return {
        ...node,
        directives: rewriteSchemaDirectivesForConnectors(node.directives, pendingSources),
      };
    },
    FieldDefinition(node) {
      return rewriteConnectDirectivesOnNode(node, {
        graphEnumToName,
        nameToGraphEnum,
        sourceNameToGraphs,
        graphsWithConnect,
        singleGraphEnum,
        graphFromNodeDirectives: getJoinFieldGraph,
        // Field-level: prefer explicit `@join__field(graph:)` over the shared
        // source-name cache so two subgraphs that both use `source: "api"` keep
        // their own field ownership.
        preferNodeGraph: true,
      });
    },
    // Type-level `@connect` (Apollo entity pattern with `$this.<key>`)
    ObjectTypeDefinition(node) {
      return rewriteConnectDirectivesOnNode(node, {
        graphEnumToName,
        nameToGraphEnum,
        sourceNameToGraphs,
        graphsWithConnect,
        singleGraphEnum,
        graphFromNodeDirectives: getJoinTypeGraph,
        preferSoleJoinType: true,
      });
    },
    ObjectTypeExtension(node) {
      return rewriteConnectDirectivesOnNode(node, {
        graphEnumToName,
        nameToGraphEnum,
        sourceNameToGraphs,
        graphsWithConnect,
        singleGraphEnum,
        graphFromNodeDirectives: getJoinTypeGraph,
        preferSoleJoinType: true,
      });
    },
    InputObjectTypeDefinition(node) {
      if (CONNECT_INPUT_TYPES.has(node.name.value)) {
        return null;
      }
      return node;
    },
    ScalarTypeDefinition(node) {
      // Drop linked connect scalars — Router resolves them via `@link(connect/v0.4)`.
      if (isConnectLinkedScalarName(node.name.value)) {
        return null;
      }
      return node;
    },
    DirectiveDefinition(node) {
      // Drop Apollo connect/source + Guild-only composeDirective defs —
      // execution uses join__directive metadata.
      if (
        node.name.value === 'connect' ||
        node.name.value === 'source' ||
        node.name.value === 'composeDirective'
      ) {
        return null;
      }
      return node;
    },
  });

  // Attribute schema @source to graphs.
  // - Unique pending config for a name: fan out to every graph that referenced
  //   that name via `@connect` (shared identical config).
  // - Duplicate pending configs for the same name (different baseURLs): match
  //   each `@source` to `@join__graph(url:)` (preferred) or leftover `@transport(location)`
  //   by baseURL === url/location. Do not invent `@transport(kind: "connect")` for this.
  const pendingSourceNameCounts = new Map<string, number>();
  for (const args of pendingSources) {
    const sourceName = typeof args.name === 'string' ? args.name : undefined;
    if (!sourceName) continue;
    pendingSourceNameCounts.set(sourceName, (pendingSourceNameCounts.get(sourceName) || 0) + 1);
  }
  const graphsByLocation = readLocationToGraphs(nextDoc, nameToGraphEnum);
  const schemaJoinDirs: ConstDirectiveNode[] = [];
  for (const args of pendingSources) {
    const sourceName = typeof args.name === 'string' ? args.name : undefined;
    const graphs = new Set<string>();
    const baseURL = getSourceBaseURL(args);
    const fromLocation = baseURL ? graphsByLocation.get(baseURL) : undefined;
    if (fromLocation?.size === 1) {
      // Single graph at this location — authoritative for this config.
      // Do not also add nameToGraphEnum(sourceName) (subgraph named `api` case).
      graphs.add([...fromLocation][0]);
    } else if (
      fromLocation &&
      fromLocation.size > 1 &&
      pendingSources.every(
        other => getSourceBaseURL(other) !== baseURL || sourcesDeepEqual(other, args),
      )
    ) {
      // Same location, identical configs — genuinely shared; fan out.
      for (const g of fromLocation) {
        graphs.add(g);
      }
    } else if (!fromLocation?.size) {
      const byName = sourceName ? nameToGraphEnum.get(sourceName) : undefined;
      if (byName) {
        graphs.add(byName);
      }
      const fromConnect = sourceName ? sourceNameToGraphs.get(sourceName) : undefined;
      const uniquePending = sourceName ? pendingSourceNameCounts.get(sourceName) === 1 : false;
      if (fromConnect && uniquePending) {
        for (const g of fromConnect) {
          graphs.add(g);
        }
      }
      // Duplicate-name configs without a transport match: do not guess a graph.
      if (!graphs.size && uniquePending && singleGraphEnum) {
        graphs.add(singleGraphEnum);
      }
      if (!graphs.size && uniquePending && graphsWithConnect.size === 1) {
        graphs.add([...graphsWithConnect][0]);
      }
    }
    for (const graphEnum of graphs) {
      graphsWithConnect.add(graphEnum);
      if (sourceName) {
        rememberSourceGraph(sourceNameToGraphs, sourceName, graphEnum);
      }
      schemaJoinDirs.push(buildJoinDirective(graphEnum, 'source', args));
    }
  }

  for (const graphEnum of graphsWithConnect) {
    schemaJoinDirs.unshift(
      buildJoinDirective(graphEnum, 'link', {
        url: CONNECT_SPEC,
        import: ['@connect', '@source'],
      }),
    );
  }

  if (schemaJoinDirs.length) {
    nextDoc = visit(nextDoc, {
      SchemaDefinition(node) {
        return {
          ...node,
          directives: [...(node.directives || []), ...schemaJoinDirs],
        };
      },
    });
  }

  // Stable schema directive order for snapshots / consumers:
  // @link* → Mesh (@transport, …) → join link → join source → other joins.
  // Lift may emit owned `@source` as join__directive before `@transport`; normalize here.
  nextDoc = visit(nextDoc, {
    SchemaDefinition(node) {
      return { ...node, directives: canonicalizeSchemaDirectives(node.directives) };
    },
    SchemaExtension(node) {
      return { ...node, directives: canonicalizeSchemaDirectives(node.directives) };
    },
  });

  if (
    !nextDoc.definitions.some(
      d => d.kind === Kind.DIRECTIVE_DEFINITION && d.name.value === 'join__directive',
    )
  ) {
    const extras = parse(JOIN_DIRECTIVE_DEFS, { noLocation: true });
    nextDoc = {
      ...nextDoc,
      definitions: [...nextDoc.definitions, ...extras.definitions],
    };
  }

  return print(nextDoc).trim();
}

function canonicalizeSchemaDirectives(
  directives: readonly ConstDirectiveNode[] | undefined,
): ConstDirectiveNode[] {
  if (!directives?.length) {
    return [];
  }
  const links: ConstDirectiveNode[] = [];
  const mesh: ConstDirectiveNode[] = [];
  const joinLinks: ConstDirectiveNode[] = [];
  const joinSources: ConstDirectiveNode[] = [];
  const otherJoins: ConstDirectiveNode[] = [];
  const other: ConstDirectiveNode[] = [];
  for (const dir of directives) {
    if (dir.name.value === 'link') {
      links.push(dir);
      continue;
    }
    if (dir.name.value === 'join__directive') {
      const name = getStringArg(dir, 'name');
      if (name === 'link') {
        joinLinks.push(dir);
      } else if (name === 'source') {
        joinSources.push(dir);
      } else {
        otherJoins.push(dir);
      }
      continue;
    }
    if (
      dir.name.value === 'transport' ||
      dir.name.value === 'pubsubOperation' ||
      dir.name.value === 'meshSource' ||
      dir.name.value === 'merge'
    ) {
      mesh.push(dir);
      continue;
    }
    other.push(dir);
  }
  return [...links, ...mesh, ...other, ...joinLinks, ...joinSources, ...otherJoins];
}

function readJoinGraphMap(document: DocumentNode): Map<string, string> {
  const map = new Map<string, string>();
  for (const def of document.definitions) {
    if (def.kind !== Kind.ENUM_TYPE_DEFINITION || def.name.value !== 'join__Graph') {
      continue;
    }
    for (const value of (def as EnumTypeDefinitionNode).values || []) {
      const graphDir = value.directives?.find(d => d.name.value === 'join__graph');
      const name = graphDir ? getStringArg(graphDir, 'name') : value.name.value;
      if (name) {
        map.set(value.name.value, name);
      }
    }
  }
  return map;
}

function getJoinFieldGraph(
  directives: readonly ConstDirectiveNode[] | undefined,
): string | undefined {
  return getJoinGraphArg(directives, 'join__field');
}

function getJoinTypeGraph(
  directives: readonly ConstDirectiveNode[] | undefined,
): string | undefined {
  return getJoinGraphArg(directives, 'join__type');
}

/**
 * Preferred graph for type-level `@connect` when source name does not match a
 * subgraph name: sole distinct `@join__type` graph (multiple keys on one graph
 * still count as one), else the single non-extension / resolvable owner join
 * when a stub join is also present.
 */
function getPreferredTypeJoinGraph(
  directives: readonly ConstDirectiveNode[] | undefined,
): string | undefined {
  const byGraph = new Map<string, { extension: boolean; resolvable: boolean }>();
  for (const dir of directives || []) {
    if (dir.name.value !== 'join__type') {
      continue;
    }
    const graphArg = dir.arguments?.find(a => a.name.value === 'graph');
    if (graphArg?.value.kind !== Kind.ENUM) {
      continue;
    }
    const graph = graphArg.value.value;
    const extension = getBooleanArg(dir, 'extension') === true;
    const resolvable = getBooleanArg(dir, 'resolvable') !== false;
    const prev = byGraph.get(graph);
    byGraph.set(graph, {
      // An extension entry sticks for that graph. Any resolvable key keeps it eligible
      // (Federation allows repeatable `@key` with per-key `resolvable` flags).
      extension: Boolean(prev?.extension || extension),
      resolvable: prev ? prev.resolvable || resolvable : resolvable,
    });
  }
  if (byGraph.size === 1) {
    return byGraph.keys().next().value;
  }
  const owners: string[] = [];
  for (const [graph, meta] of byGraph) {
    if (!meta.extension && meta.resolvable) {
      owners.push(graph);
    }
  }
  return owners.length === 1 ? owners[0] : undefined;
}

function rewriteSchemaDirectivesForConnectors(
  directives: readonly ConstDirectiveNode[] | undefined,
  pendingSources: Array<Record<string, unknown>>,
): ConstDirectiveNode[] {
  const kept: ConstDirectiveNode[] = [];
  for (const dir of directives || []) {
    if (dir.name.value === 'source') {
      // Apollo SCHEMA `@source` — rewrite later to `@join__directive`
      pendingSources.push(constDirectiveArgsToJs(dir));
      continue;
    }
    if (dir.name.value === 'composeDirective') {
      // Guild-only / Mesh loader stamps — not on the optimized supergraph.
      continue;
    }
    if (dir.name.value === 'link') {
      const url = getStringArg(dir, 'url');
      if (url?.startsWith('https://specs.apollo.dev/join/')) {
        kept.push(replaceLinkUrl(dir, JOIN_V05));
        continue;
      }
      if (url?.startsWith('https://specs.apollo.dev/connect')) {
        // Connectors EXECUTION link — no import list (join__directive carries defs)
        kept.push({
          kind: Kind.DIRECTIVE,
          name: { kind: Kind.NAME, value: 'link' },
          arguments: [
            stringArg('url', CONNECT_SPEC),
            {
              kind: Kind.ARGUMENT,
              name: { kind: Kind.NAME, value: 'for' },
              value: { kind: Kind.ENUM, value: 'EXECUTION' },
            },
          ],
        });
        continue;
      }
      if (url?.startsWith('https://specs.apollo.dev/federation/')) {
        const stripped = removeImportFromLink(dir, '@composeDirective');
        if (stripped) {
          kept.push(stripped);
        }
        continue;
      }
    }
    kept.push(dir);
  }
  return kept;
}

/** Drop one import name from `@link(import:)`; drop the whole link if import empties. */
function removeImportFromLink(
  directive: ConstDirectiveNode,
  importName: string,
): ConstDirectiveNode | null {
  const importArg = directive.arguments?.find(a => a.name.value === 'import');
  if (!importArg || importArg.value.kind !== Kind.LIST) {
    return directive;
  }
  const values = importArg.value.values.filter(v => {
    if (v.kind === Kind.STRING) {
      return v.value !== importName;
    }
    return true;
  });
  if (values.length === importArg.value.values.length) {
    return directive;
  }
  if (values.length === 0) {
    // Federation link with only @composeDirective — drop entirely from final SG.
    return null;
  }
  return {
    ...directive,
    arguments: (directive.arguments || []).map(arg =>
      arg.name.value === 'import'
        ? { ...arg, value: { kind: Kind.LIST, values } }
        : arg,
    ),
  };
}

function getBooleanArg(dir: ConstDirectiveNode, name: string): boolean | undefined {
  const arg = dir.arguments?.find(a => a.name.value === name);
  if (!arg) {
    return undefined;
  }
  if (arg.value.kind === Kind.BOOLEAN) {
    return arg.value.value;
  }
  return undefined;
}

function getJoinGraphArg(
  directives: readonly ConstDirectiveNode[] | undefined,
  directiveName: string,
): string | undefined {
  const joinDir = directives?.find(d => d.name.value === directiveName);
  if (!joinDir) {
    return undefined;
  }
  const graphArg = joinDir.arguments?.find(a => a.name.value === 'graph');
  if (graphArg?.value.kind === Kind.ENUM) {
    return graphArg.value.value;
  }
  return undefined;
}

function getSourceBaseURL(args: Record<string, unknown>): string | undefined {
  const http = args.http;
  if (!http || typeof http !== 'object' || Array.isArray(http)) {
    return undefined;
  }
  const baseURL = (http as Record<string, unknown>).baseURL;
  return typeof baseURL === 'string' ? baseURL : undefined;
}

function sourcesDeepEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Map location/url → join graph enums.
 * Prefer `@join__graph(url:)` (no Mesh `@transport` needed for Connectors).
 * Fall back to leftover schema `@transport(location)` for older SDL.
 */
function readLocationToGraphs(
  document: DocumentNode,
  nameToGraphEnum: Map<string, string>,
): Map<string, Set<string>> {
  const byLocation = new Map<string, Set<string>>();
  const remember = (location: string | undefined, graphEnum: string | undefined) => {
    if (!location || !graphEnum) {
      return;
    }
    let graphs = byLocation.get(location);
    if (!graphs) {
      graphs = new Set();
      byLocation.set(location, graphs);
    }
    graphs.add(graphEnum);
  };
  for (const def of document.definitions) {
    if (def.kind === Kind.ENUM_TYPE_DEFINITION && def.name.value === 'join__Graph') {
      for (const value of def.values || []) {
        const graphDir = value.directives?.find(d => d.name.value === 'join__graph');
        if (!graphDir) continue;
        const name = getStringArg(graphDir, 'name') || value.name.value;
        remember(getStringArg(graphDir, 'url'), nameToGraphEnum.get(name) || value.name.value);
      }
      continue;
    }
    if (def.kind !== Kind.SCHEMA_DEFINITION && def.kind !== Kind.SCHEMA_EXTENSION) {
      continue;
    }
    for (const dir of def.directives || []) {
      if (dir.name.value !== 'transport') {
        continue;
      }
      const location = getStringArg(dir, 'location');
      const subgraph = getStringArg(dir, 'subgraph');
      if (!location || !subgraph) {
        continue;
      }
      remember(location, nameToGraphEnum.get(subgraph));
    }
  }
  return byLocation;
}

function rememberSourceGraph(
  sourceNameToGraphs: Map<string, Set<string>>,
  sourceName: string,
  graphEnum: string,
) {
  let graphs = sourceNameToGraphs.get(sourceName);
  if (!graphs) {
    graphs = new Set();
    sourceNameToGraphs.set(sourceName, graphs);
  }
  graphs.add(graphEnum);
}

function firstSourceGraph(
  sourceNameToGraphs: Map<string, Set<string>>,
  sourceName: string,
): string | undefined {
  const graphs = sourceNameToGraphs.get(sourceName);
  if (!graphs?.size) {
    return undefined;
  }
  return graphs.values().next().value;
}

function rewriteConnectDirectivesOnNode<
  T extends {
    directives?: readonly ConstDirectiveNode[];
  },
>(
  node: T,
  ctx: {
    graphEnumToName: Map<string, string>;
    nameToGraphEnum: Map<string, string>;
    sourceNameToGraphs: Map<string, Set<string>>;
    graphsWithConnect: Set<string>;
    singleGraphEnum: string | undefined;
    graphFromNodeDirectives: (
      directives: readonly ConstDirectiveNode[] | undefined,
    ) => string | undefined;
    /** Field-level: prefer `@join__field(graph:)` before the source-name cache. */
    preferNodeGraph?: boolean;
    /** Type-level: prefer sole/owner `@join__type` before the source-name cache. */
    preferSoleJoinType?: boolean;
  },
): T {
  const connectDirs = (node.directives || []).filter(d => d.name.value === 'connect');
  if (!connectDirs.length) {
    return node;
  }

  const otherDirs = (node.directives || []).filter(d => d.name.value !== 'connect');
  const joinDirs: ConstDirectiveNode[] = [];

  for (const connectDir of connectDirs) {
    const args = constDirectiveArgsToJs(connectDir);
    const sourceName = typeof args.source === 'string' ? args.source : undefined;
    // Field-level: prefer explicit `@join__field(graph:)` before source→subgraph
    // name match — a subgraph named `api` must not steal inventory's
    // `@connect(source: "api")` when the field is owned by INVENTORY.
    // Type-level: prefer sole/owner `@join__type` before source→subgraph name
    // match so Product/Airline stay on the Connectors owner (not a stub, and not
    // a differently-named subgraph that happens to match `source`).
    // Then `@connect(source:)` → subgraph name, then the shared source-name cache.
    const graphEnum =
      (ctx.preferNodeGraph ? ctx.graphFromNodeDirectives(node.directives) : undefined) ||
      (ctx.preferSoleJoinType ? getPreferredTypeJoinGraph(node.directives) : undefined) ||
      (sourceName ? ctx.nameToGraphEnum.get(sourceName) : undefined) ||
      (sourceName ? firstSourceGraph(ctx.sourceNameToGraphs, sourceName) : undefined) ||
      ctx.singleGraphEnum;
    if (!graphEnum) {
      // Keep raw @connect if we cannot attribute a graph
      return node;
    }
    ctx.graphsWithConnect.add(graphEnum);
    if (sourceName) {
      rememberSourceGraph(ctx.sourceNameToGraphs, sourceName, graphEnum);
    }
    joinDirs.push(buildJoinDirective(graphEnum, 'connect', args));
  }

  return {
    ...node,
    directives: [...otherDirs, ...joinDirs],
  };
}

function buildJoinDirective(
  graphEnum: string,
  name: string,
  args: Record<string, unknown>,
): ConstDirectiveNode {
  const argsNode = astFromValueUntyped(args) as ConstValueNode;
  return {
    kind: Kind.DIRECTIVE,
    name: { kind: Kind.NAME, value: 'join__directive' },
    arguments: [
      {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: 'graphs' },
        value: {
          kind: Kind.LIST,
          values: [{ kind: Kind.ENUM, value: graphEnum }],
        },
      },
      stringArg('name', name),
      {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: 'args' },
        value: argsNode,
      },
    ],
  };
}

function replaceLinkUrl(dir: ConstDirectiveNode, url: string): ConstDirectiveNode {
  return {
    ...dir,
    arguments: (dir.arguments || []).map(arg =>
      arg.name.value === 'url' ? stringArg('url', url) : arg,
    ),
  };
}

function stringArg(name: string, value: string): ConstArgumentNode {
  return {
    kind: Kind.ARGUMENT,
    name: { kind: Kind.NAME, value: name },
    value: { kind: Kind.STRING, value },
  };
}

function getStringArg(directive: ConstDirectiveNode, name: string): string | undefined {
  const arg = directive.arguments?.find(a => a.name.value === name);
  return arg?.value.kind === Kind.STRING ? arg.value.value : undefined;
}

function constDirectiveArgsToJs(directive: ConstDirectiveNode): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const arg of directive.arguments || []) {
    out[arg.name.value] = constValueToJs(arg.value);
  }
  return out;
}

function constValueToJs(value: ConstValueNode): unknown {
  switch (value.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
    case Kind.ENUM:
      return value.value;
    case Kind.INT:
      return parseInt(value.value, 10);
    case Kind.FLOAT:
      return parseFloat(value.value);
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return value.values.map(constValueToJs);
    case Kind.OBJECT: {
      const obj: Record<string, unknown> = {};
      for (const field of value.fields) {
        obj[field.name.value] = constValueToJs(field.value);
      }
      return obj;
    }
    default:
      return undefined;
  }
}
