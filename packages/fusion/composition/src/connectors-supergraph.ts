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
 * directives (`@transport`, `@length`, `@meshSource`, …) are kept — Hive
 * needs `@transport` to select the REST transport.
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
      const kept: ConstDirectiveNode[] = [];
      for (const dir of node.directives || []) {
        if (dir.name.value === 'source') {
          // Apollo SCHEMA `@source` — rewrite later to `@join__directive`
          pendingSources.push(constDirectiveArgsToJs(dir));
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
        }
        kept.push(dir);
      }
      return { ...node, directives: kept };
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
      // Drop Apollo connect/source defs — execution uses join__directive metadata.
      if (node.name.value === 'connect' || node.name.value === 'source') {
        return null;
      }
      return node;
    },
  });

  // Attribute schema @source to every graph that referenced that source name
  // (by source→subgraph name match, connect usage, or sole graph).
  const schemaJoinDirs: ConstDirectiveNode[] = [];
  for (const args of pendingSources) {
    const sourceName = typeof args.name === 'string' ? args.name : undefined;
    const graphs = new Set<string>();
    const byName = sourceName ? nameToGraphEnum.get(sourceName) : undefined;
    if (byName) {
      graphs.add(byName);
    }
    const fromConnect = sourceName ? sourceNameToGraphs.get(sourceName) : undefined;
    if (fromConnect) {
      for (const g of fromConnect) {
        graphs.add(g);
      }
    }
    if (!graphs.size && singleGraphEnum) {
      graphs.add(singleGraphEnum);
    }
    if (!graphs.size && graphsWithConnect.size === 1) {
      graphs.add([...graphsWithConnect][0]);
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

/** Sole `@join__type(graph:)` when the type has exactly one join graph. */
function getSoleJoinTypeGraph(
  directives: readonly ConstDirectiveNode[] | undefined,
): string | undefined {
  const graphs: string[] = [];
  for (const dir of directives || []) {
    if (dir.name.value !== 'join__type') {
      continue;
    }
    const graphArg = dir.arguments?.find(a => a.name.value === 'graph');
    if (graphArg?.value.kind === Kind.ENUM) {
      graphs.push(graphArg.value.value);
    }
  }
  return graphs.length === 1 ? graphs[0] : undefined;
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
    /** Type-level: prefer a sole `@join__type` before the source-name cache. */
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
    // Prefer `@connect(source:)` → subgraph name over the first `@join__type` /
    // `@join__field`. Multi-subgraph entity types list extension graphs first
    // (e.g. Catalog stub + OData owner); attributing type-level entity `@connect`
    // to the stub graph breaks Router ("Object type has no field …") and Hive
    // `_entities` planning against the Connectors owner.
    // Field-level `@connect` still prefers an explicit `@join__field(graph:)`
    // before the shared source-name cache (two subgraphs may both use `source: "api"`).
    // Type-level prefers a sole `@join__type` before that cache so a Product with
    // only PRODUCTS is not stolen by a later field that wrote `api → INVENTORY`.
    const graphEnum =
      (sourceName ? ctx.nameToGraphEnum.get(sourceName) : undefined) ||
      (ctx.preferNodeGraph ? ctx.graphFromNodeDirectives(node.directives) : undefined) ||
      (ctx.preferSoleJoinType ? getSoleJoinTypeGraph(node.directives) : undefined) ||
      (sourceName ? firstSourceGraph(ctx.sourceNameToGraphs, sourceName) : undefined) ||
      (ctx.preferNodeGraph || ctx.preferSoleJoinType
        ? undefined
        : ctx.graphFromNodeDirectives(node.directives)) ||
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
