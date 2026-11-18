import type {
  ConstArgumentNode,
  ConstDirectiveNode,
  ConstValueNode,
  DocumentNode,
  EnumTypeDefinitionNode,
} from 'graphql';
import { Kind, parse, print, visit } from 'graphql';
import { astFromValueUntyped } from '@graphql-tools/utils';

/**
 * Mesh Compose post-process (GM-41, safe subset).
 *
 * After Guild federation composition:
 * 1. Drop schema `@transport` when it is pure `kind: "http"` (or omitted kind treated as http),
 *    has no `headers` / `options`, and `location` equals that subgraph's `@join__graph(url:)`.
 *    Hive Gateway already seeds `kind: "http"` entries from `join__Graph` — the Mesh
 *    `@transport` would be duplicate data.
 * 2. Otherwise, when `location` matches `@join__graph(url:)` for the same subgraph name,
 *    strip only the redundant `location` arg (keep `subgraph` — Gateway indexes transports
 *    by `transport.subgraph` today).
 *
 * **Not in this pass (needs Hive Gateway / fusion-runtime):**
 * - Rewrite Mesh field/type directives (`@hoist`, `@merge`, `@source`, …) to
 *   `@join__directive` and drop their definitions / `@link` imports.
 * - Drop `@transport` for non-`http` kinds (`connect`, `sql`, …) or when options remain.
 * - Strip `subgraph:` from field/type Mesh directives (Gateway matches on that arg today).
 *
 * TODO(hive-gateway / GM-41): teach `getTransportEntryMapUsingFusionAndFederationDirectives`
 * and Mesh directive readers (`hoist`, `source`, …) to consume `@join__directive`, then
 * enable the full rewrite + unused-definition prune here.
 */
export function finalizeMeshJoinDirectives(supergraphSdl: string): string {
  if (!supergraphSdl?.includes('@transport') && !supergraphSdl?.includes('join__graph')) {
    return supergraphSdl;
  }

  const document = parse(supergraphSdl, { noLocation: true });
  const joinByName = readJoinGraphNameToUrl(document);
  if (joinByName.size === 0) {
    return supergraphSdl;
  }

  let changed = false;
  const nextDoc = visit(document, {
    SchemaDefinition(node) {
      const result = rewriteSchemaTransports(node.directives, joinByName);
      if (result.changed) {
        changed = true;
      }
      return { ...node, directives: result.directives };
    },
    SchemaExtension(node) {
      const result = rewriteSchemaTransports(node.directives, joinByName);
      if (result.changed) {
        changed = true;
      }
      return { ...node, directives: result.directives };
    },
  });

  if (!changed) {
    return supergraphSdl;
  }

  // Drop unused `@transport` definition / Mesh `@link` import when no usages remain.
  return print(pruneUnusedTransportArtifacts(nextDoc)).trim();
}

function readJoinGraphNameToUrl(document: DocumentNode): Map<string, string> {
  const map = new Map<string, string>();
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
      if (name && typeof url === 'string') {
        map.set(name, url);
      }
    }
  }
  return map;
}

function rewriteSchemaTransports(
  directives: readonly ConstDirectiveNode[] | undefined,
  joinByName: Map<string, string>,
): { directives: ConstDirectiveNode[]; changed: boolean } {
  if (!directives?.length) {
    return { directives: [], changed: false };
  }
  let changed = false;
  const next: ConstDirectiveNode[] = [];
  for (const dir of directives) {
    if (dir.name.value !== 'transport') {
      next.push(dir);
      continue;
    }
    const args = constDirectiveArgsToJs(dir);
    const subgraph = typeof args.subgraph === 'string' ? args.subgraph : undefined;
    const location = typeof args.location === 'string' ? args.location : undefined;
    const kind = typeof args.kind === 'string' ? args.kind : 'http';
    const joinUrl = subgraph ? joinByName.get(subgraph) : undefined;
    const locationMatches =
      typeof location === 'string' && typeof joinUrl === 'string' && location === joinUrl;
    const hasExtras =
      args.headers != null ||
      (args.options != null &&
        typeof args.options === 'object' &&
        !Array.isArray(args.options) &&
        Object.keys(args.options as object).length > 0);

    // Pure http transport duplicated by join__graph → drop entirely.
    if (kind === 'http' && locationMatches && !hasExtras) {
      changed = true;
      continue;
    }

    // Non-http (or http with extras): strip redundant location only.
    if (locationMatches && 'location' in args) {
      const { location: _drop, ...rest } = args;
      next.push(buildDirective('transport', rest));
      changed = true;
      continue;
    }

    next.push(dir);
  }
  return { directives: next, changed };
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
          // Keep if another directive still references it — only transport used it.
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

function buildDirective(name: string, args: Record<string, unknown>): ConstDirectiveNode {
  const argumentsNode: ConstArgumentNode[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined) {
      continue;
    }
    const ast = astFromValueUntyped(value) as ConstValueNode | undefined;
    if (!ast) {
      continue;
    }
    argumentsNode.push({
      kind: Kind.ARGUMENT,
      name: { kind: Kind.NAME, value: key },
      value: ast,
    });
  }
  return {
    kind: Kind.DIRECTIVE,
    name: { kind: Kind.NAME, value: name },
    arguments: argumentsNode,
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
