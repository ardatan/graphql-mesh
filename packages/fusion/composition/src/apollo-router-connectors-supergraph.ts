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

const MESH_ONLY_DIRECTIVES = new Set(['transport', 'length', 'meshSource']);
const CONNECT_INPUT_TYPES = new Set([
  'ConnectHTTP',
  'SourceHTTP',
  'HTTPHeaderMapping',
  'ConnectorErrors',
  'BatchSettings',
]);

/**
 * Apollo Router activates Connectors from `@join__directive(name: "connect"|"source")`
 * metadata produced by Rover — not from raw `@connect` / `@source` usages that Guild
 * composeDirective keeps on the Mesh/Hive supergraph.
 *
 * Rewrite a Mesh Guild connectors supergraph into the Rover-shaped form so Router
 * can execute Connectors without a separate Rover compose step.
 *
 * Hive Gateway still consumes the raw `@connect` / `@source` Mesh SDL; only call this
 * when feeding Apollo Router.
 */
export function toApolloRouterConnectorsSupergraph(supergraphSdl: string): string {
  if (!supergraphSdl.includes('specs.apollo.dev/connect') || !supergraphSdl.includes('@connect')) {
    return supergraphSdl;
  }

  const document = parse(supergraphSdl, { noLocation: true });
  const graphEnumToName = readJoinGraphMap(document);
  const nameToGraphEnum = new Map<string, string>();
  for (const [enumVal, name] of graphEnumToName) {
    nameToGraphEnum.set(name, enumVal);
  }
  const singleGraphEnum =
    graphEnumToName.size === 1 ? [...graphEnumToName.keys()][0] : undefined;

  const pendingSources: Array<Record<string, unknown>> = [];
  const sourceNameToGraph = new Map<string, string>();
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
        if (MESH_ONLY_DIRECTIVES.has(dir.name.value)) {
          continue;
        }
        if (dir.name.value === 'link') {
          const url = getStringArg(dir, 'url');
          if (url?.startsWith('https://specs.apollo.dev/join/')) {
            kept.push(replaceLinkUrl(dir, JOIN_V05));
            continue;
          }
          if (url?.startsWith('https://specs.apollo.dev/connect')) {
            // Rover: @link(url: connect/v0.4, for: EXECUTION) — no import list
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
          if (url?.startsWith('https://the-guild.dev/graphql/mesh/spec/')) {
            continue; // drop Mesh spec link for Router
          }
        }
        kept.push(dir);
      }
      return { ...node, directives: kept };
    },
    FieldDefinition(node) {
      const connectDirs = (node.directives || []).filter(d => d.name.value === 'connect');
      if (!connectDirs.length) {
        return stripMeshDirectives(node);
      }

      const otherDirs = (node.directives || []).filter(
        d => d.name.value !== 'connect' && !MESH_ONLY_DIRECTIVES.has(d.name.value),
      );
      const joinDirs: ConstDirectiveNode[] = [];

      for (const connectDir of connectDirs) {
        const args = constDirectiveArgsToJs(connectDir);
        const sourceName = typeof args.source === 'string' ? args.source : undefined;
        const graphEnum =
          getJoinFieldGraph(node.directives) ||
          (sourceName ? nameToGraphEnum.get(sourceName) : undefined) ||
          (sourceName ? sourceNameToGraph.get(sourceName) : undefined) ||
          singleGraphEnum;
        if (!graphEnum) {
          // Keep raw @connect if we cannot attribute a graph (should not happen for Mesh SG)
          return node;
        }
        graphsWithConnect.add(graphEnum);
        if (sourceName) {
          sourceNameToGraph.set(sourceName, graphEnum);
        }
        joinDirs.push(buildJoinDirective(graphEnum, 'connect', args));
      }

      return {
        ...node,
        directives: [...otherDirs, ...joinDirs],
      };
    },
    ScalarTypeDefinition(node) {
      // ObjMap only exists for Mesh @transport
      if (node.name.value === 'ObjMap') {
        return null;
      }
      return stripMeshDirectives(node);
    },
    ObjectTypeDefinition(node) {
      return stripMeshDirectives(node);
    },
    InterfaceTypeDefinition(node) {
      return stripMeshDirectives(node);
    },
    EnumTypeDefinition(node) {
      return stripMeshDirectives(node);
    },
    UnionTypeDefinition(node) {
      return stripMeshDirectives(node);
    },
    InputObjectTypeDefinition(node) {
      if (CONNECT_INPUT_TYPES.has(node.name.value)) {
        return null;
      }
      return stripMeshDirectives(node);
    },
    DirectiveDefinition(node) {
      // Drop Apollo connect/source defs — Router uses join__directive metadata only.
      // Drop Mesh-only directive defs left after stripping usages.
      if (
        node.name.value === 'connect' ||
        node.name.value === 'source' ||
        MESH_ONLY_DIRECTIVES.has(node.name.value)
      ) {
        return null;
      }
      return node;
    },
  });

  // Attribute schema @source to graphs (by source name → subgraph name, connect usage, or sole graph)
  const schemaJoinDirs: ConstDirectiveNode[] = [];
  for (const args of pendingSources) {
    const sourceName = typeof args.name === 'string' ? args.name : undefined;
    const graphEnum =
      (sourceName ? nameToGraphEnum.get(sourceName) : undefined) ||
      (sourceName ? sourceNameToGraph.get(sourceName) : undefined) ||
      singleGraphEnum ||
      (graphsWithConnect.size === 1 ? [...graphsWithConnect][0] : undefined);
    if (!graphEnum) {
      continue;
    }
    graphsWithConnect.add(graphEnum);
    if (sourceName) {
      sourceNameToGraph.set(sourceName, graphEnum);
    }
    schemaJoinDirs.push(buildJoinDirective(graphEnum, 'source', args));
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

function stripMeshDirectives<T extends { directives?: readonly ConstDirectiveNode[] }>(
  node: T,
): T {
  const dirs = node.directives;
  if (!dirs?.some(d => MESH_ONLY_DIRECTIVES.has(d.name.value))) {
    return node;
  }
  return {
    ...node,
    directives: dirs.filter(d => !MESH_ONLY_DIRECTIVES.has(d.name.value)),
  };
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
  const joinField = directives?.find(d => d.name.value === 'join__field');
  if (!joinField) {
    return undefined;
  }
  const graphArg = joinField.arguments?.find(a => a.name.value === 'graph');
  if (graphArg?.value.kind === Kind.ENUM) {
    return graphArg.value.value;
  }
  return undefined;
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
