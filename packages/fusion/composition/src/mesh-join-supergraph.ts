import type {
  ConstArgumentNode,
  ConstDirectiveNode,
  ConstValueNode,
  DocumentNode,
  EnumTypeDefinitionNode,
} from 'graphql';
import { Kind, parse, print, visit } from 'graphql';
import { astFromValueUntyped } from '@graphql-tools/utils';

const JOIN_V05 = 'https://specs.apollo.dev/join/v0.5';

const JOIN_DIRECTIVE_DEFS = /* GraphQL */ `
  directive @join__directive(
    graphs: [join__Graph!]
    name: String!
    args: join__DirectiveArguments
  ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION
  scalar join__DirectiveArguments
`;

/**
 * Mesh Compose post-process (GM-41) — emit the **most optimized** supergraph.
 *
 * Gateway / fusion-runtime still accepts every composition path (raw schema
 * `@transport`, `@join__directive(name: "transport")`, connect infer from
 * `@connect`/`@source`). Mesh Compose always collapses to the lean form:
 *
 * 1. Drop pure `kind: "http"` when `location` matches `@join__graph(url:)`
 *    (Gateway seeds http from `join__Graph`).
 * 2. Drop `kind: "connect"` when there are no `headers` / `options`
 *    (Gateway infers `connect` from `@join__directive` connect/source).
 * 3. Otherwise rewrite to `@join__directive(graphs:, name: "transport", args:)`:
 *    - drop `subgraph` when it matches `@join__graph(name:)`
 *    - drop `location` when it equals `@join__graph(url:)`
 *    - keep `kind` / `options` / non-empty `headers` / override `location`
 * 4. Prune unused `@transport` def / `TransportOptions` / core `@link` import.
 *
 * Field/type Mesh dirs (`@hoist`, `@merge`, `@source`, …) → `@join__directive`
 * is a follow-up.
 */
export function finalizeMeshJoinDirectives(supergraphSdl: string): string {
  if (!supergraphSdl?.includes('@transport') && !supergraphSdl?.includes('join__graph')) {
    return supergraphSdl;
  }

  const document = parse(supergraphSdl, { noLocation: true });
  const joinInfo = readJoinGraphInfo(document);
  if (joinInfo.nameToEnum.size === 0) {
    return supergraphSdl;
  }

  let changed = false;
  let emittedJoinTransport = false;
  const nextDoc = visit(document, {
    SchemaDefinition(node) {
      const result = rewriteSchemaTransports(node.directives, joinInfo);
      if (result.changed) {
        changed = true;
      }
      if (result.emittedJoinTransport) {
        emittedJoinTransport = true;
      }
      return { ...node, directives: result.directives };
    },
    SchemaExtension(node) {
      const result = rewriteSchemaTransports(node.directives, joinInfo);
      if (result.changed) {
        changed = true;
      }
      if (result.emittedJoinTransport) {
        emittedJoinTransport = true;
      }
      return { ...node, directives: result.directives };
    },
  });

  if (!changed) {
    return supergraphSdl;
  }

  let finalized = pruneUnusedTransportArtifacts(nextDoc);
  if (emittedJoinTransport) {
    finalized = ensureJoinDirectiveSupport(finalized);
  }
  return print(finalized).trim();
}

type JoinGraphInfo = {
  /** subgraph name → join__Graph enum value */
  nameToEnum: Map<string, string>;
  /** subgraph name → join__graph url */
  nameToUrl: Map<string, string>;
};

function readJoinGraphInfo(document: DocumentNode): JoinGraphInfo {
  const nameToEnum = new Map<string, string>();
  const nameToUrl = new Map<string, string>();
  for (const def of document.definitions) {
    if (def.kind !== Kind.ENUM_TYPE_DEFINITION || def.name.value !== 'join__Graph') {
      continue;
    }
    for (const value of (def as EnumTypeDefinitionNode).values || []) {
      const graphDir = value.directives?.find(d => d.name.value === 'join__graph');
      if (!graphDir) {
        continue;
      }
      const name = getStringArg(graphDir, 'name') || value.name.value;
      const url = getStringArg(graphDir, 'url');
      nameToEnum.set(name, value.name.value);
      if (typeof url === 'string') {
        nameToUrl.set(name, url);
      }
    }
  }
  return { nameToEnum, nameToUrl };
}

function rewriteSchemaTransports(
  directives: readonly ConstDirectiveNode[] | undefined,
  joinInfo: JoinGraphInfo,
): { directives: ConstDirectiveNode[]; changed: boolean; emittedJoinTransport: boolean } {
  if (!directives?.length) {
    return { directives: [], changed: false, emittedJoinTransport: false };
  }
  let changed = false;
  let emittedJoinTransport = false;
  const next: ConstDirectiveNode[] = [];
  for (const dir of directives) {
    if (dir.name.value !== 'transport') {
      next.push(dir);
      continue;
    }
    const args = constDirectiveArgsToJs(dir);
    const subgraph = typeof args.subgraph === 'string' ? args.subgraph : undefined;
    const graphEnum = subgraph ? joinInfo.nameToEnum.get(subgraph) : undefined;
    if (!subgraph || !graphEnum) {
      // Cannot attribute to a join graph — leave raw `@transport`.
      next.push(dir);
      continue;
    }

    const location = typeof args.location === 'string' ? args.location : undefined;
    const joinUrl = joinInfo.nameToUrl.get(subgraph);
    const locationMatches =
      typeof location === 'string' && typeof joinUrl === 'string' && location === joinUrl;
    const kind = typeof args.kind === 'string' ? args.kind : 'http';
    const headers = normalizeHeaders(args.headers);
    const options = normalizeOptions(args.options);

    // Pure http duplicated by join__graph → drop entirely.
    if (kind === 'http' && locationMatches && headers === undefined && options === undefined) {
      changed = true;
      continue;
    }

    // Connect: Gateway infers `kind: "connect"` from join connect/source.
    // Drop entirely when nothing remains; if options/headers/override location,
    // emit join transport args *without* `kind: "connect"`.
    if (kind === 'connect') {
      if (headers === undefined && options === undefined && (locationMatches || location == null)) {
        changed = true;
        continue;
      }
      const connectArgs: Record<string, unknown> = {};
      if (typeof location === 'string' && !locationMatches) {
        connectArgs.location = location;
      }
      if (headers !== undefined) {
        connectArgs.headers = headers;
      }
      if (options !== undefined) {
        connectArgs.options = options;
      }
      if (Object.keys(connectArgs).length === 0) {
        changed = true;
        continue;
      }
      next.push(buildJoinDirective(graphEnum, 'transport', connectArgs));
      changed = true;
      emittedJoinTransport = true;
      continue;
    }

    const joinArgs: Record<string, unknown> = { kind };
    // subgraph matches join__graph(name:) → owned by graphs:, drop.
    // location matches join__graph(url:) → drop; keep overrides.
    if (typeof location === 'string' && !locationMatches) {
      joinArgs.location = location;
    }
    if (headers !== undefined) {
      joinArgs.headers = headers;
    }
    if (options !== undefined) {
      joinArgs.options = options;
    }

    next.push(buildJoinDirective(graphEnum, 'transport', joinArgs));
    changed = true;
    emittedJoinTransport = true;
  }
  return { directives: next, changed, emittedJoinTransport };
}

function normalizeHeaders(value: unknown): unknown | undefined {
  if (value == null) {
    return undefined;
  }
  if (Array.isArray(value) && value.length === 0) {
    return undefined;
  }
  return value;
}

function normalizeOptions(value: unknown): unknown | undefined {
  if (value == null) {
    return undefined;
  }
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as object).length === 0
  ) {
    return undefined;
  }
  return value;
}

function pruneUnusedTransportArtifacts(document: DocumentNode): DocumentNode {
  let hasTransportUsage = false;
  visit(document, {
    Directive(node) {
      if (node.name.value === 'transport') {
        hasTransportUsage = true;
      }
    },
  });
  if (hasTransportUsage) {
    return document;
  }

  return {
    ...document,
    definitions: document.definitions
      .filter(def => {
        if (def.kind === Kind.DIRECTIVE_DEFINITION && def.name.value === 'transport') {
          return false;
        }
        if (def.kind === Kind.SCALAR_TYPE_DEFINITION && def.name.value === 'TransportOptions') {
          return false;
        }
        return true;
      })
      .map(def => {
        if (
          (def.kind === Kind.SCHEMA_DEFINITION || def.kind === Kind.SCHEMA_EXTENSION) &&
          def.directives?.length
        ) {
          return {
            ...def,
            directives: def.directives
              .map(dir => {
                if (dir.name.value !== 'link') {
                  return dir;
                }
                return removeImportFromLink(dir, '@transport');
              })
              .filter(Boolean) as ConstDirectiveNode[],
          };
        }
        return def;
      }),
  };
}

function ensureJoinDirectiveSupport(document: DocumentNode): DocumentNode {
  let next = document;
  // Bump join @link to v0.5 when still on an older join URL.
  next = visit(next, {
    SchemaDefinition(node) {
      return { ...node, directives: bumpJoinLink(node.directives) };
    },
    SchemaExtension(node) {
      return { ...node, directives: bumpJoinLink(node.directives) };
    },
  });

  if (
    !next.definitions.some(
      d => d.kind === Kind.DIRECTIVE_DEFINITION && d.name.value === 'join__directive',
    )
  ) {
    const extras = parse(JOIN_DIRECTIVE_DEFS, { noLocation: true });
    next = {
      ...next,
      definitions: [...next.definitions, ...extras.definitions],
    };
  }
  return next;
}

function bumpJoinLink(directives: readonly ConstDirectiveNode[] | undefined): ConstDirectiveNode[] {
  if (!directives?.length) {
    return [];
  }
  return directives.map(dir => {
    if (dir.name.value !== 'link') {
      return dir;
    }
    const url = getStringArg(dir, 'url');
    if (!url?.startsWith('https://specs.apollo.dev/join/')) {
      return dir;
    }
    if (url === JOIN_V05) {
      return dir;
    }
    return {
      ...dir,
      arguments: (dir.arguments || []).map(arg =>
        arg.name.value === 'url'
          ? {
              kind: Kind.ARGUMENT,
              name: { kind: Kind.NAME, value: 'url' },
              value: { kind: Kind.STRING, value: JOIN_V05 },
            }
          : arg,
      ),
    };
  });
}

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
    if (v.kind === Kind.OBJECT) {
      const nameField = v.fields.find(f => f.name.value === 'name');
      const asField = v.fields.find(f => f.name.value === 'as');
      const name = nameField?.value.kind === Kind.STRING ? nameField.value.value : undefined;
      const as = asField?.value.kind === Kind.STRING ? asField.value.value : undefined;
      return name !== importName && as !== importName;
    }
    return true;
  });
  if (values.length === importArg.value.values.length) {
    return directive;
  }
  // Drop the whole Mesh/core @link when import list becomes empty.
  if (values.length === 0) {
    const url = getStringArg(directive, 'url');
    if (
      url?.includes('specs.graphql-mesh.com/core/') ||
      url?.includes('the-guild.dev/graphql/mesh/spec/') ||
      url?.includes('graphql-mesh.com/spec/')
    ) {
      return null;
    }
    return {
      ...directive,
      arguments: (directive.arguments || []).filter(a => a.name.value !== 'import'),
    };
  }
  return {
    ...directive,
    arguments: (directive.arguments || []).map(arg =>
      arg.name.value === 'import'
        ? {
            ...arg,
            value: { kind: Kind.LIST, values },
          }
        : arg,
    ),
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
      {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: 'name' },
        value: { kind: Kind.STRING, value: name },
      },
      {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: 'args' },
        value: argsNode,
      },
    ],
  };
}

function getStringArg(directive: ConstDirectiveNode, name: string): string | undefined {
  const arg = directive.arguments?.find(a => a.name.value === name);
  if (arg?.value.kind === Kind.STRING) {
    return arg.value.value;
  }
  return undefined;
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
