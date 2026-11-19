import type {
  ConstDirectiveNode,
  ConstValueNode,
  DocumentNode,
  EnumTypeDefinitionNode,
} from 'graphql';
import { Kind, parse, print, visit } from 'graphql';
import { astFromValueUntyped } from '@graphql-tools/utils';

const JOIN_V05 = 'https://specs.apollo.dev/join/v0.5';

/**
 * Locations `@graphql-tools/federation` extract reconstitutes from
 * `@join__directive` → native apps. Argument / enum-value / input-field
 * join apps are left as-is by extract, so Mesh rename metadata on those
 * locations must stay native on the final supergraph.
 */
const JOIN_DIRECTIVE_DEFS = /* GraphQL */ `
  directive @join__directive(
    graphs: [join__Graph!]
    name: String!
    args: join__DirectiveArguments
  ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION
  scalar join__DirectiveArguments
`;

type MeshJoinLocation =
  | 'SCHEMA'
  | 'OBJECT'
  | 'INTERFACE'
  | 'FIELD_DEFINITION'
  | 'ARGUMENT_DEFINITION'
  | 'INPUT_FIELD_DEFINITION'
  | 'ENUM_VALUE'
  | 'SCALAR'
  | 'UNION'
  | 'ENUM'
  | 'INPUT_OBJECT';

const JOIN_SAFE_MESH_LOCATIONS = new Set<MeshJoinLocation>([
  'SCHEMA',
  'OBJECT',
  'INTERFACE',
  'FIELD_DEFINITION',
]);

/**
 * Mesh core field/type dirs rewritten to `@join__directive` on the final
 * supergraph. Ownership lives in `graphs:`; drop redundant `subgraph:` args and
 * drop native defs / Mesh `@link` imports / `@composeDirective` stamps.
 *
 * Subgraph SDLs from loaders still keep native apps + composeDirective so a
 * subgraph handed to Apollo Router keeps working.
 */
/**
 * Subgraph-owned Mesh dirs → `@join__directive` on the final supergraph.
 *
 * NOT join-ified (not subgraph-owned / not final-SG metadata):
 * - `@resolveTo` / `@additionalField` — gateway/virtual field wiring
 * - `@extraSchemaDefinitionDirective` — SCHEMA-usage composition workaround; lifted
 *   away before this pass (`liftExtraSchemaDefinitionDirectives`)
 *
 * Protocol field dirs (`@thrift__rpc`, `@sql`, `@protobuf__rpc`, …) join the same
 * way as `@merge` — `graphs:` owns attribution; drop redundant `subgraph:`.
 */
const MESH_TO_JOIN = new Set([
  'merge',
  'hoist',
  'pubsubOperation',
  'pubsubPublish',
  'thrift__rpc',
  'sql',
  'protobuf__rpc',
]);

/**
 * Protocol field dirs keep their `directive @…` definitions on the final SG so
 * federation extract can reconstitute native apps for transports that still
 * read `@thrift__rpc` / `@sql` / … (not join__directive). Apps still become
 * `@join__directive`; imports stay. Core Mesh dirs (`@merge`, …) drop defs.
 */
const MESH_JOIN_KEEP_DEFS = new Set(['thrift__rpc', 'sql', 'protobuf__rpc']);

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
 * 5. `@merge` / `@hoist` / Mesh `@source`|`@meshSource` / protocol field dirs
 *    (`@thrift__rpc`, `@sql`, `@protobuf__rpc`, …) → join without `subgraph:`
 *    (graphs: owns attribution). When Connectors `@source` is also present,
 *    Compose aliases Mesh stitching source as `@meshSource` and join uses
 *    `name: "meshSource"`. Mesh `@link` **imports** for those names stay
 *    (join apps still reference them); native defs / composeDirective drop.
 * 6. Leave `@resolveTo` / `@additionalField` native (not subgraph-owned).
 * 7. Always prune orphan Mesh artifacts loaders leave when nothing was
 *    rewritten (unused `TransportOptions`, unused `@source` def/`@link` import
 *    from filter-only transforms, etc.).
 */
export function finalizeMeshJoinDirectives(supergraphSdl: string): string {
  if (
    !supergraphSdl?.includes('join__graph') &&
    !supergraphSdl?.includes('@transport') &&
    !supergraphSdl?.includes('@merge') &&
    !supergraphSdl?.includes('@meshSource') &&
    !supergraphSdl?.includes('@hoist') &&
    !supergraphSdl?.includes('@thrift__rpc') &&
    !supergraphSdl?.includes('@sql') &&
    !supergraphSdl?.includes('@protobuf__rpc') &&
    !supergraphSdl?.includes('TransportOptions') &&
    !supergraphSdl?.includes('directive @source')
  ) {
    return supergraphSdl;
  }

  const document = parse(supergraphSdl, { noLocation: true });
  const joinInfo = readJoinGraphInfo(document);
  // Orphan prune still runs when join__Graph is missing (rare) but Mesh leftovers exist.
  const canRewriteTransports = joinInfo.nameToEnum.size > 0;

  let changed = false;
  let emittedJoinTransport = false;
  let emittedMeshJoin = false;
  const rewrittenMeshNames = new Set<string>();

  function rewriteTypeNode<T extends { directives?: readonly ConstDirectiveNode[] }>(
    node: T,
    location: MeshJoinLocation,
  ): T {
    const mesh = rewriteMeshDirectivesOnNode(node, joinInfo, {
      location,
      preferJoinField: false,
      preferJoinType: true,
    });
    if (mesh.changed) {
      changed = true;
      emittedMeshJoin = true;
      for (const n of mesh.rewrittenNames) {
        rewrittenMeshNames.add(n);
      }
    }
    return mesh.node;
  }

  const nextDoc = canRewriteTransports
    ? visit(document, {
        SchemaDefinition(node) {
          const transport = rewriteSchemaTransports(node.directives, joinInfo);
          if (transport.changed) {
            changed = true;
          }
          if (transport.emittedJoinTransport) {
            emittedJoinTransport = true;
          }
          const mesh = rewriteMeshDirectivesOnNode(
            { ...node, directives: transport.directives },
            joinInfo,
            { location: 'SCHEMA', preferJoinField: false },
          );
          if (mesh.changed) {
            changed = true;
            emittedMeshJoin = true;
            for (const n of mesh.rewrittenNames) {
              rewrittenMeshNames.add(n);
            }
          }
          return mesh.node;
        },
        SchemaExtension(node) {
          const transport = rewriteSchemaTransports(node.directives, joinInfo);
          if (transport.changed) {
            changed = true;
          }
          if (transport.emittedJoinTransport) {
            emittedJoinTransport = true;
          }
          const mesh = rewriteMeshDirectivesOnNode(
            { ...node, directives: transport.directives },
            joinInfo,
            { location: 'SCHEMA', preferJoinField: false },
          );
          if (mesh.changed) {
            changed = true;
            emittedMeshJoin = true;
            for (const n of mesh.rewrittenNames) {
              rewrittenMeshNames.add(n);
            }
          }
          return mesh.node;
        },
        ObjectTypeDefinition(node) {
          return rewriteTypeNode(node, 'OBJECT');
        },
        ObjectTypeExtension(node) {
          return rewriteTypeNode(node, 'OBJECT');
        },
        InterfaceTypeDefinition(node) {
          return rewriteTypeNode(node, 'INTERFACE');
        },
        InterfaceTypeExtension(node) {
          return rewriteTypeNode(node, 'INTERFACE');
        },
        // INPUT_OBJECT / UNION / ENUM / SCALAR: extract does not reconstitute join
        // on these the same way — leave Mesh dirs native (still subgraph-scoped).
        FieldDefinition(node) {
          const mesh = rewriteMeshDirectivesOnNode(node, joinInfo, {
            location: 'FIELD_DEFINITION',
            preferJoinField: true,
          });
          if (mesh.changed) {
            changed = true;
            emittedMeshJoin = true;
            for (const n of mesh.rewrittenNames) {
              rewrittenMeshNames.add(n);
            }
          }
          return mesh.node;
        },
      })
    : document;

  // Always prune orphans — even when no transport/mesh rewrite ran (e.g. filter-only
  // subgraphs leave unused `@source` def + `TransportOptions` scalar).
  let finalized = pruneUnusedTransportArtifacts(nextDoc);
  finalized = pruneUnusedMeshDirectiveArtifacts(finalized);
  if (emittedMeshJoin || rewrittenMeshNames.size > 0) {
    finalized = pruneRewrittenMeshArtifacts(finalized, rewrittenMeshNames);
    finalized = relaxSubgraphArgOnMeshDefs(finalized, rewrittenMeshNames);
  }
  if (emittedJoinTransport || emittedMeshJoin) {
    finalized = ensureJoinDirectiveSupport(finalized, { expandLocations: emittedMeshJoin });
  }
  const printed = print(finalized).trim();
  return changed || printed !== supergraphSdl.trim() ? printed : supergraphSdl;
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
    // For http, matching location is omitted (Gateway seeds from join__graph).
    // Protocol kinds (thrift / sql / …) keep location — transports call `new URL(location)`
    // and must not depend solely on join__graph seeding.
    if (typeof location === 'string' && (kind !== 'http' || !locationMatches)) {
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

function rewriteMeshDirectivesOnNode<T extends { directives?: readonly ConstDirectiveNode[] }>(
  node: T,
  joinInfo: JoinGraphInfo,
  opts: {
    location: MeshJoinLocation;
    preferJoinField?: boolean;
    preferJoinType?: boolean;
    fallbackGraphEnum?: string;
  },
): { node: T; changed: boolean; rewrittenNames: Set<string> } {
  const rewrittenNames = new Set<string>();
  if (!node.directives?.length) {
    return { node, changed: false, rewrittenNames };
  }
  if (!JOIN_SAFE_MESH_LOCATIONS.has(opts.location)) {
    return { node, changed: false, rewrittenNames };
  }

  let changed = false;
  const next: ConstDirectiveNode[] = [];
  const fallbackGraph =
    opts.fallbackGraphEnum ||
    (opts.preferJoinField ? graphEnumFromJoinField(node.directives) : undefined) ||
    (opts.preferJoinType ? graphEnumFromJoinType(node.directives) : undefined);

  for (const dir of node.directives) {
    if (!shouldRewriteMeshDirective(dir)) {
      next.push(dir);
      continue;
    }

    const args = constDirectiveArgsToJs(dir);
    const subgraph = typeof args.subgraph === 'string' ? args.subgraph : undefined;
    const ownerGraphEnum =
      (subgraph ? joinInfo.nameToEnum.get(subgraph) : undefined) || fallbackGraph;

    if (!ownerGraphEnum) {
      // Cannot attribute — leave native so Gateway / Router can still see it.
      next.push(dir);
      continue;
    }

    if (isMeshFieldSource(dir)) {
      // Stitching `@source` / `@meshSource`: federation extract used to copy
      // *native* apps onto every subgraph, then Gateway filtered by `subgraph:`.
      // Emit join for each join__type/join__field graph on the node (or all
      // graphs when none — e.g. shared root without `@join__field`), keep
      // `subgraph` in args, keep name `source` or `meshSource` (Compose alias
      // when Connectors `@source` is also in the composition).
      const siblingGraphs = allJoinGraphsOnNode(node.directives);
      const graphs = siblingGraphs.length > 0 ? siblingGraphs : [...joinInfo.nameToEnum.values()];
      for (const g of graphs) {
        next.push(buildJoinDirective(g, dir.name.value, args));
      }
      changed = true;
      rewrittenNames.add(dir.name.value);
      continue;
    }

    // `@merge` / `@hoist` / …: drop redundant subgraph — graphs: is enough.
    const joinArgs = { ...args };
    delete joinArgs.subgraph;
    next.push(buildJoinDirective(ownerGraphEnum, dir.name.value, joinArgs));
    changed = true;
    rewrittenNames.add(dir.name.value);
  }

  if (!changed) {
    return { node, changed: false, rewrittenNames };
  }
  return { node: { ...node, directives: next }, changed: true, rewrittenNames };
}

function shouldRewriteMeshDirective(dir: ConstDirectiveNode): boolean {
  if (MESH_TO_JOIN.has(dir.name.value)) {
    return true;
  }
  return isMeshFieldSource(dir);
}

/**
 * Mesh stitching `@source` / `@meshSource` (not Apollo Connectors SCHEMA
 * `@source` with `http`, which is already join-ified by connectors finalize).
 */
function isMeshFieldSource(dir: ConstDirectiveNode): boolean {
  if (dir.name.value === 'meshSource') {
    return true;
  }
  if (dir.name.value !== 'source') {
    return false;
  }
  const args = constDirectiveArgsToJs(dir);
  if (args.http != null) {
    return false;
  }
  return args.subgraph != null || args.name != null;
}

/** join__field / join__type graphs on this node (source broadcast targets). */
function allJoinGraphsOnNode(directives: readonly ConstDirectiveNode[] | undefined): string[] {
  const graphs: string[] = [];
  const seen = new Set<string>();
  for (const d of directives || []) {
    if (d.name.value !== 'join__field' && d.name.value !== 'join__type') {
      continue;
    }
    const g = getEnumArg(d, 'graph');
    if (g && !seen.has(g)) {
      seen.add(g);
      graphs.push(g);
    }
  }
  return graphs;
}

function graphEnumFromJoinField(
  directives: readonly ConstDirectiveNode[] | undefined,
): string | undefined {
  const graphs = new Set<string>();
  for (const d of directives || []) {
    if (d.name.value !== 'join__field') {
      continue;
    }
    const g = getEnumArg(d, 'graph');
    if (g) {
      graphs.add(g);
    }
  }
  return graphs.size === 1 ? graphs.values().next().value : undefined;
}

function graphEnumFromJoinType(
  directives: readonly ConstDirectiveNode[] | undefined,
): string | undefined {
  const graphs = new Set<string>();
  for (const d of directives || []) {
    if (d.name.value !== 'join__type') {
      continue;
    }
    const g = getEnumArg(d, 'graph');
    if (g) {
      graphs.add(g);
    }
  }
  return graphs.size === 1 ? graphs.values().next().value : undefined;
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
        if (def.kind !== Kind.SCHEMA_DEFINITION && def.kind !== Kind.SCHEMA_EXTENSION) {
          return def;
        }
        const dirs = (def.directives || [])
          .map(dir => {
            if (dir.name.value !== 'link') {
              return dir;
            }
            return removeImportFromLink(dir, '@transport');
          })
          .filter((d): d is ConstDirectiveNode => d != null);
        return { ...def, directives: dirs };
      }),
  };
}

/**
 * Mesh directive names that may appear as unused defs/`@link` imports on the
 * final SG when loaders/transforms stamped them but no native apps remain
 * (e.g. filter-only subgraph → `@source` import with zero apps; HTTP loader →
 * `TransportOptions` without `@transport`).
 */
const MESH_ORPHAN_DIRECTIVE_NAMES: readonly string[] = [
  'source',
  'meshSource',
  'merge',
  'hoist',
  'pubsubOperation',
  'pubsubPublish',
  'thrift__rpc',
  'sql',
  'protobuf__rpc',
];

/**
 * Mesh directive names referenced via `@join__directive(name: "…")` on the SG.
 * Those still need their Mesh `@link` import even when native apps are gone.
 */
function collectJoinCarriedMeshNames(document: DocumentNode): Set<string> {
  const names = new Set<string>();
  const orphan = new Set<string>(MESH_ORPHAN_DIRECTIVE_NAMES);
  visit(document, {
    Directive(node) {
      if (node.name.value !== 'join__directive') {
        return;
      }
      const nameArg = node.arguments?.find(a => a.name.value === 'name');
      if (nameArg?.value.kind === Kind.STRING && orphan.has(nameArg.value.value)) {
        names.add(nameArg.value.value);
      }
    },
  });
  return names;
}

/**
 * Drop unused Mesh directive defs when no native apps remain. Drop `@link`
 * imports only when neither native apps nor `@join__directive(name:)` carry
 * the directive — join-carried Mesh dirs still need the Mesh `@link` import.
 */
function pruneUnusedMeshDirectiveArtifacts(document: DocumentNode): DocumentNode {
  const usedNative = new Set<string>();
  visit(document, {
    Directive(node) {
      usedNative.add(node.name.value);
    },
  });
  const joinCarried = collectJoinCarriedMeshNames(document);

  // Drop unused defs unless join-carried protocol dirs that must keep defs
  // for federation extract → transport readers.
  const dropDefs = new Set(
    MESH_ORPHAN_DIRECTIVE_NAMES.filter(name => {
      if (usedNative.has(name)) {
        return false;
      }
      if (joinCarried.has(name) && MESH_JOIN_KEEP_DEFS.has(name)) {
        return false;
      }
      return true;
    }),
  );

  // Imports stay when join apps still name the directive. Aliased Mesh
  // stitching source (`{name: "@source", as: "@meshSource"}`) is keyed by
  // join name `meshSource` — do not strip `@source` while that join lives.
  const importNamesToStrip = new Set(
    MESH_ORPHAN_DIRECTIVE_NAMES.filter(name => {
      if (usedNative.has(name) || joinCarried.has(name)) {
        return false;
      }
      if (name === 'source' && joinCarried.has('meshSource')) {
        return false;
      }
      return true;
    }).map(name => `@${name}`),
  );
  if (dropDefs.size === 0 && importNamesToStrip.size === 0) {
    return document;
  }

  return {
    ...document,
    definitions: document.definitions
      .filter(def => {
        if (def.kind === Kind.DIRECTIVE_DEFINITION && dropDefs.has(def.name.value)) {
          return false;
        }
        return true;
      })
      .map(def => {
        if (def.kind !== Kind.SCHEMA_DEFINITION && def.kind !== Kind.SCHEMA_EXTENSION) {
          return def;
        }
        if (importNamesToStrip.size === 0) {
          // Still drop composeDirective for defs we removed.
          const dirs = (def.directives || [])
            .map(dir => {
              if (dir.name.value !== 'composeDirective') {
                return dir;
              }
              const name = getStringArg(dir, 'name');
              if (name && dropDefs.has(name.slice(1))) {
                return null;
              }
              return dir;
            })
            .filter((d): d is ConstDirectiveNode => d != null);
          return { ...def, directives: dirs };
        }
        const dirs = (def.directives || [])
          .map(dir => {
            if (dir.name.value === 'composeDirective') {
              const name = getStringArg(dir, 'name');
              if (name && (importNamesToStrip.has(name) || dropDefs.has(name.slice(1)))) {
                return null;
              }
              return dir;
            }
            if (dir.name.value !== 'link') {
              return dir;
            }
            let next: ConstDirectiveNode | null = dir;
            for (const importName of importNamesToStrip) {
              if (!next) {
                break;
              }
              next = removeImportFromLink(next, importName);
            }
            return next;
          })
          .filter((d): d is ConstDirectiveNode => d != null);
        return { ...def, directives: dirs };
      }),
  };
}

/**
 * Drop Mesh directive defs / composeDirective for dirs now carried only as
 * `@join__directive`. Keep Mesh `@link` imports — join apps still name them.
 */
function pruneRewrittenMeshArtifacts(
  document: DocumentNode,
  rewrittenNames: Set<string>,
): DocumentNode {
  if (rewrittenNames.size === 0) {
    return document;
  }

  // Keep defs for any Mesh dir that still has native apps
  // (e.g. `@source` on ARGUMENT_DEFINITION — extract does not reconstitute those).
  const stillNative = new Set<string>();
  visit(document, {
    Directive(node) {
      if (rewrittenNames.has(node.name.value)) {
        stillNative.add(node.name.value);
      }
    },
  });

  const dropDefs = new Set(
    [...rewrittenNames].filter(name => !stillNative.has(name) && !MESH_JOIN_KEEP_DEFS.has(name)),
  );

  return {
    ...document,
    definitions: document.definitions
      .filter(def => {
        if (def.kind === Kind.DIRECTIVE_DEFINITION && dropDefs.has(def.name.value)) {
          return false;
        }
        return true;
      })
      .map(def => {
        if (def.kind !== Kind.SCHEMA_DEFINITION && def.kind !== Kind.SCHEMA_EXTENSION) {
          return def;
        }
        const dirs = (def.directives || [])
          .map(dir => {
            if (dir.name.value === 'composeDirective') {
              const name = getStringArg(dir, 'name');
              // composeDirective is composition-input only on final SG
              if (
                name &&
                (dropDefs.has(name.slice(1)) ||
                  rewrittenNames.has(name.slice(1)) ||
                  name === '@meshSource' ||
                  name === '@source' ||
                  name === '@merge' ||
                  name === '@hoist')
              ) {
                return null;
              }
              return dir;
            }
            return dir;
          })
          .filter((d): d is ConstDirectiveNode => d != null);
        return { ...def, directives: dirs };
      }),
  };
}

/**
 * After field Mesh dirs become join (no subgraph), extract reconstitutes native
 * apps without `subgraph`. Remaining defs (kept for ARGUMENT_DEFINITION natives)
 * must not require `subgraph: String!`.
 */
function relaxSubgraphArgOnMeshDefs(
  document: DocumentNode,
  rewrittenNames: Set<string>,
): DocumentNode {
  if (rewrittenNames.size === 0) {
    return document;
  }
  return {
    ...document,
    definitions: document.definitions.map(def => {
      if (def.kind !== Kind.DIRECTIVE_DEFINITION || !rewrittenNames.has(def.name.value)) {
        return def;
      }
      if (!def.arguments?.length) {
        return def;
      }
      let changed = false;
      const args = def.arguments.map(arg => {
        if (arg.name.value !== 'subgraph') {
          return arg;
        }
        if (arg.type.kind === Kind.NON_NULL_TYPE) {
          changed = true;
          return { ...arg, type: arg.type.type };
        }
        return arg;
      });
      return changed ? { ...def, arguments: args } : def;
    }),
  };
}

function ensureJoinDirectiveSupport(
  document: DocumentNode,
  opts: { expandLocations?: boolean } = {},
): DocumentNode {
  let next: DocumentNode = document;

  const hasJoinDirectiveDef = next.definitions.some(
    d => d.kind === Kind.DIRECTIVE_DEFINITION && d.name.value === 'join__directive',
  );

  if (hasJoinDirectiveDef && opts.expandLocations) {
    // Replace locations so Mesh dirs on ARGUMENT_DEFINITION / ENUM / etc. validate.
    next = {
      ...next,
      definitions: next.definitions.map(def => {
        if (def.kind !== Kind.DIRECTIVE_DEFINITION || def.name.value !== 'join__directive') {
          return def;
        }
        const expanded = parse(JOIN_DIRECTIVE_DEFS, { noLocation: true }).definitions.find(
          d => d.kind === Kind.DIRECTIVE_DEFINITION && d.name.value === 'join__directive',
        );
        return expanded ?? def;
      }),
    };
  }

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
  } else if (
    opts.expandLocations &&
    !next.definitions.some(
      d => d.kind === Kind.SCALAR_TYPE_DEFINITION && d.name.value === 'join__DirectiveArguments',
    )
  ) {
    // join__directive may already exist without the args scalar — add it.
    const scalarOnly = parse(`scalar join__DirectiveArguments`, { noLocation: true });
    next = {
      ...next,
      definitions: [...next.definitions, ...scalarOnly.definitions],
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

function getEnumArg(directive: ConstDirectiveNode, name: string): string | undefined {
  const arg = directive.arguments?.find(a => a.name.value === name);
  if (arg?.value.kind === Kind.ENUM) {
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
