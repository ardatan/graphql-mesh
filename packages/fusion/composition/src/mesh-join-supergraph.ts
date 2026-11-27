import type {
  ConstDirectiveNode,
  ConstValueNode,
  DocumentNode,
  EnumTypeDefinitionNode,
} from 'graphql';
import { Kind, parse, print, visit } from 'graphql';
import { isMeshSpecLinkUrl } from '@graphql-mesh/utils';
import { astFromValueUntyped } from '@graphql-tools/utils';
import { prepareJoinDirectiveArgs } from './ast-from-value-block.js';

const JOIN_V05 = 'https://specs.apollo.dev/join/v0.5';

/**
 * Locations Mesh rewrites to `@join__directive` on the lean SG.
 * Federation extract reconstitutes FIELD_DEFINITION / OBJECT / INTERFACE /
 * SCHEMA joins → native apps. ARGUMENT_DEFINITION joins are copied through
 * as `@join__directive` (extract does not reconstitute args); Gateway reads
 * `name: "is"` from those joins when synthesizing `@lookup` hops.
 */
const JOIN_DIRECTIVE_DEFS = /* GraphQL */ `
  directive @join__directive(
    graphs: [join__Graph!]
    name: String!
    args: join__DirectiveArguments
  ) repeatable on SCHEMA | OBJECT | INTERFACE | FIELD_DEFINITION | ARGUMENT_DEFINITION
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
  'ARGUMENT_DEFINITION',
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
 * - `@resolveTo` / `@additionalField` - gateway/virtual field wiring
 * - `@extraSchemaDefinitionDirective` - SCHEMA-usage composition workaround; lifted
 *   away before this pass (`liftExtraSchemaDefinitionDirectives`)
 *
 * Protocol field dirs (`@thrift__rpc`, `@sql`, `@protobuf__rpc`, …) join the same
 * way as `@merge` - `graphs:` owns attribution; drop redundant `subgraph:`.
 */
const MESH_TO_JOIN = new Set([
  'merge',
  // Federation Spec draft entity-recall dirs (same join pattern as `@merge`).
  'lookup',
  'is',
  'internal',
  'hoist',
  'pubsubOperation',
  'pubsubPublish',
  'thrift__rpc',
  'sql',
  'protobuf__rpc',
]);

/**
 * Enums / scalars that exist only to type protocol directive args. When the
 * native `directive @…` def is dropped (apps live as `@join__directive`), these
 * become unused on the lean SG - federation extract reconstitutes apps from
 * join args without needing the def or companion enum.
 */
const MESH_PROTOCOL_COMPANION_TYPES: Readonly<Record<string, readonly string[]>> = {
  thrift__rpc: ['ThriftMessageType'],
  sql: ['SqlKind'],
  // Federation Spec `@is(field: FieldSelectionMap!)` — drop the scalar when
  // native `@is` apps are fully join-carried.
  is: ['FieldSelectionMap'],
};

/**
 * Mesh Compose post-process (GM-41) - emit the **most optimized** supergraph.
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
 * 5. `@merge` / `@lookup` / `@is` / `@internal` / `@hoist` / Mesh `@source`|
 *    `@meshSource` / protocol field dirs (`@thrift__rpc`, `@sql`,
 *    `@protobuf__rpc`, …) → join without `subgraph:` (graphs: owns attribution).
 *    When Connectors `@source` is also present, Compose aliases Mesh stitching
 *    source as `@meshSource` and join uses `name: "meshSource"`. Mesh /
 *    federation-spec `@link` **imports** for those names stay (join apps still
 *    reference them); native defs / composeDirective / companion enums
 *    (`ThriftMessageType`, `SqlKind`) drop. Federation extract reconstitutes
 *    native apps onto subgraph schemas without needing those defs on the SG
 *    (`@is` arg joins stay as `@join__directive`; Gateway reads them).
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
    !supergraphSdl?.includes('@lookup') &&
    !supergraphSdl?.includes('@internal') &&
    !supergraphSdl?.includes('@meshSource') &&
    !supergraphSdl?.includes('@hoist') &&
    !supergraphSdl?.includes('@thrift__rpc') &&
    !supergraphSdl?.includes('@sql') &&
    !supergraphSdl?.includes('@protobuf__rpc') &&
    !supergraphSdl?.includes('TransportOptions') &&
    !supergraphSdl?.includes('ThriftMessageType') &&
    !supergraphSdl?.includes('SqlKind') &&
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
        // on these the same way - leave Mesh dirs native (still subgraph-scoped).
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
          let nextField = mesh.node;
          // Federation Spec `@is` (and Mesh `@source` on args) live on
          // ARGUMENT_DEFINITION — rewrite here; extract keeps arg joins as
          // `@join__directive` (Gateway synthesizes lookup hops from them).
          if (nextField.arguments?.length) {
            // Prefer the field's `@join__field`, else a single graph from any
            // `@join__directive` already on the field (e.g. just-rewritten
            // `@lookup`), else leave fallback unset so rewrite broadcasts.
            const fieldGraph =
              graphEnumFromJoinField(nextField.directives) ||
              graphEnumFromJoinDirective(nextField.directives);
            const nextArgs = nextField.arguments.map(arg => {
              const argMesh = rewriteMeshDirectivesOnNode(arg, joinInfo, {
                location: 'ARGUMENT_DEFINITION',
                preferJoinField: true,
                fallbackGraphEnum: fieldGraph,
                // Only Federation Spec `@is` — Mesh `@source` on args stays
                // native (rename metadata; extract does not reconstitute those).
                onlyNames: new Set(['is']),
              });
              if (argMesh.changed) {
                changed = true;
                emittedMeshJoin = true;
                for (const n of argMesh.rewrittenNames) {
                  rewrittenMeshNames.add(n);
                }
              }
              return argMesh.node;
            });
            nextField = { ...nextField, arguments: nextArgs };
          }
          return nextField;
        },
      })
    : document;

  // Always prune orphans - even when no transport/mesh rewrite ran (e.g. filter-only
  // subgraphs leave unused `@source` def + `TransportOptions` scalar).
  let finalized = pruneUnusedTransportArtifacts(nextDoc);
  finalized = pruneUnusedMeshDirectiveArtifacts(finalized);
  if (emittedMeshJoin || rewrittenMeshNames.size > 0) {
    finalized = pruneRewrittenMeshArtifacts(finalized, rewrittenMeshNames);
    finalized = relaxSubgraphArgOnMeshDefs(finalized, rewrittenMeshNames);
  }
  // Drop Mesh `@link(url:)` with no imports (e.g. core left after `@transport` strip).
  finalized = pruneEmptyMeshLinks(finalized);
  // Mesh `@typescript` / `@example` / `@regexp` on SCALAR/ENUM: subgraph SDLs keep
  // them (Hive Connect `processScalarType` / local tooling). On the lean SG they
  // must go - Apollo Router connector carry-over re-applies subgraph copies and
  // rejects "Directive application @… already exists" when the printed SG already
  // has the same app (FHIR/OpenAPI multi-SG shared pattern scalars).
  finalized = stripMeshCodegenScalarEnumDirectives(finalized);
  // Drop now-orphan codegen defs / Mesh `@link` imports after the strip above.
  finalized = pruneUnusedMeshDirectiveArtifacts(finalized);
  finalized = pruneEmptyMeshLinks(finalized);
  if (emittedJoinTransport || emittedMeshJoin) {
    finalized = ensureJoinDirectiveSupport(finalized, { expandLocations: emittedMeshJoin });
  }
  const printed = print(finalized).trim();
  return changed || printed !== supergraphSdl.trim() ? printed : supergraphSdl;
}

/**
 * Mesh SCALAR/ENUM apps stripped from the lean SG. Subgraph SDLs keep them;
 * Router connector carry-over re-applies from subgraphs and rejects duplicates
 * when the printed SG already has the same directive.
 */
const MESH_CODEGEN_SCALAR_ENUM_DIRS = new Set(['typescript', 'example', 'regexp']);

/**
 * Strip Mesh SCALAR/ENUM apps (`@typescript` / `@example` / `@regexp`) from the
 * final supergraph. Subgraph SDLs keep them for Hive Connect `processScalarType`
 * and local tooling.
 */
function stripMeshCodegenScalarEnumDirectives(document: DocumentNode): DocumentNode {
  return visit(document, {
    ScalarTypeDefinition(node) {
      return stripCodegenDirsOnNode(node);
    },
    EnumTypeDefinition(node) {
      return stripCodegenDirsOnNode(node);
    },
  });
}

function stripCodegenDirsOnNode<T extends { directives?: readonly ConstDirectiveNode[] }>(
  node: T,
): T {
  if (!node.directives?.length) {
    return node;
  }
  const next = node.directives.filter(dir => !MESH_CODEGEN_SCALAR_ENUM_DIRS.has(dir.name.value));
  return next.length === node.directives.length ? node : { ...node, directives: next };
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
      // Cannot attribute to a join graph - leave raw `@transport`.
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

    // Connect: Gateway infers `kind: "connect"` from join connect/source when
    // transport is absent. Drop entirely when nothing remains. If options/
    // headers/override location remain, keep a *native* `@transport` with the
    // def-required `kind` + `subgraph` (Apollo Router validates Mesh `@transport`
    // apps against the directive def). Do **not** join-carry Mesh `@transport`
    // on Connect SGs - Apollo reconstitutes join transport and rejects it.
    if (kind === 'connect') {
      if (headers === undefined && options === undefined && (locationMatches || location == null)) {
        changed = true;
        continue;
      }
      const connectArgs: Record<string, unknown> = {
        kind: 'connect',
        subgraph,
      };
      if (typeof location === 'string') {
        connectArgs.location = location;
      }
      if (headers !== undefined) {
        connectArgs.headers = headers;
      }
      if (options !== undefined) {
        connectArgs.options = options;
      }
      next.push(buildNativeTransportDirective(connectArgs));
      changed = true;
      continue;
    }

    const joinArgs: Record<string, unknown> = { kind };
    // subgraph matches join__graph(name:) → owned by graphs:, drop.
    // For http, matching location is omitted (Gateway seeds from join__graph).
    // Protocol kinds (thrift / sql / …) keep location - transports call `new URL(location)`
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
    /** When set, only rewrite these directive names (e.g. `@is` on args). */
    onlyNames?: ReadonlySet<string>;
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
    if (opts.onlyNames && !opts.onlyNames.has(dir.name.value)) {
      next.push(dir);
      continue;
    }
    if (!shouldRewriteMeshDirective(dir)) {
      next.push(dir);
      continue;
    }

    const args = constDirectiveArgsToJs(dir);
    // Explicit `subgraph:` (including empty string) must resolve via join map -
    // never fall back to a sibling field/type graph (that would re-attribute).
    // Only omit/missing `subgraph` may use the field/type graph fallback.
    const hasExplicitSubgraph = typeof args.subgraph === 'string';
    const subgraph = hasExplicitSubgraph ? args.subgraph : undefined;
    const ownerGraphEnum = hasExplicitSubgraph
      ? joinInfo.nameToEnum.get(subgraph as string)
      : fallbackGraph;

    // Root Query fields often omit `@join__field` (single-subgraph ownership).
    // Fall back to sibling join__field/join__type graphs, else every join__Graph
    // — same broadcast used for stitching `@source`. Explicit `subgraph:` that
    // does not map still leaves the app native (do not re-attribute).
    const siblingGraphs = allJoinGraphsOnNode(node.directives);
    const fallbackGraphs =
      ownerGraphEnum != null
        ? [ownerGraphEnum]
        : !hasExplicitSubgraph
          ? siblingGraphs.length > 0
            ? siblingGraphs
            : [...joinInfo.nameToEnum.values()]
          : [];
    if (fallbackGraphs.length === 0) {
      next.push(dir);
      continue;
    }

    if (isMeshFieldSource(dir)) {
      // Stitching `@source` / `@meshSource`: federation extract used to copy
      // *native* apps onto every subgraph, then Gateway filtered by `subgraph:`.
      // Emit join for each join__type/join__field graph on the node (or all
      // graphs when none - e.g. shared root without `@join__field`), keep
      // `subgraph` in args, keep name `source` or `meshSource` (Compose alias
      // when Connectors `@source` is also in the composition).
      for (const g of fallbackGraphs) {
        next.push(buildJoinDirective(g, dir.name.value, args));
      }
      changed = true;
      rewrittenNames.add(dir.name.value);
      continue;
    }

    // `@merge` / `@lookup` / `@is` / `@hoist` / …: drop redundant subgraph -
    // graphs: is enough.
    const joinArgs = { ...args };
    delete joinArgs.subgraph;
    for (const g of fallbackGraphs) {
      next.push(buildJoinDirective(g, dir.name.value, joinArgs));
    }
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

/** Single shared `graphs:` enum across `@join__directive` apps on this node. */
function graphEnumFromJoinDirective(
  directives: readonly ConstDirectiveNode[] | undefined,
): string | undefined {
  const graphs = new Set<string>();
  for (const d of directives || []) {
    if (d.name.value !== 'join__directive') {
      continue;
    }
    for (const g of getEnumListArg(d, 'graphs')) {
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
  let hasJoinCarriedTransport = false;
  visit(document, {
    Directive(node) {
      if (node.name.value === 'transport') {
        hasTransportUsage = true;
      }
      if (node.name.value === 'join__directive') {
        const nameArg = node.arguments?.find(a => a.name.value === 'name');
        if (nameArg?.value.kind === Kind.STRING && nameArg.value.value === 'transport') {
          hasJoinCarriedTransport = true;
        }
      }
    },
  });
  // Keep `directive @transport` (+ TransportOptions / @link) when join-carried so
  // Apollo Router reconstitution of `@join__directive(name: "transport")` has a def.
  if (hasTransportUsage || hasJoinCarriedTransport) {
    return document;
  }

  const transportOptionsReferenced = documentReferencesTypeName(document, 'TransportOptions', {
    ignoreDirectiveDefs: ['transport'],
  });

  return {
    ...document,
    definitions: document.definitions
      .filter(def => {
        if (def.kind === Kind.DIRECTIVE_DEFINITION && def.name.value === 'transport') {
          return false;
        }
        if (def.kind === Kind.SCALAR_TYPE_DEFINITION && def.name.value === 'TransportOptions') {
          // Keep when application types still reference the scalar (e.g. Query.settings).
          return transportOptionsReferenced;
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
 * True when any NamedType in the document still references `typeName`.
 * Optionally skip directive definition subtrees that are about to be dropped
 * (their arg types must not keep companion scalars alive).
 */
function documentReferencesTypeName(
  document: DocumentNode,
  typeName: string,
  opts?: { ignoreDirectiveDefs?: Iterable<string> },
): boolean {
  const ignore = new Set(opts?.ignoreDirectiveDefs || []);
  let referenced = false;
  visit(document, {
    DirectiveDefinition: {
      enter(node) {
        if (ignore.has(node.name.value)) {
          return false;
        }
      },
    },
    // Also ignore the type's own definition (scalar/enum self-name is not a use).
    ScalarTypeDefinition: {
      enter(node) {
        if (node.name.value === typeName) {
          return false;
        }
      },
    },
    EnumTypeDefinition: {
      enter(node) {
        if (node.name.value === typeName) {
          return false;
        }
      },
    },
    NamedType(node) {
      if (node.name.value === typeName) {
        referenced = true;
      }
    },
  });
  return referenced;
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
  // Codegen-only; stripped from the lean SG before this orphan pass runs again.
  'typescript',
  'regexp',
  'example',
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
 * the directive - join-carried Mesh dirs still need the Mesh `@link` import.
 */
function pruneUnusedMeshDirectiveArtifacts(document: DocumentNode): DocumentNode {
  const usedNative = new Set<string>();
  visit(document, {
    Directive(node) {
      usedNative.add(node.name.value);
    },
  });
  const joinCarried = collectJoinCarriedMeshNames(document);

  // Drop unused native defs - join-carried protocol dirs keep `@link` imports
  // only; federation extract reconstitutes apps from `@join__directive`.
  const dropDefs = new Set(
    MESH_ORPHAN_DIRECTIVE_NAMES.filter(name => {
      if (usedNative.has(name)) {
        return false;
      }
      return true;
    }),
  );
  const dropCompanionTypes = new Set<string>();
  for (const name of dropDefs) {
    for (const companion of MESH_PROTOCOL_COMPANION_TYPES[name] || []) {
      // Keep companions still referenced by retained application types.
      if (!documentReferencesTypeName(document, companion, { ignoreDirectiveDefs: dropDefs })) {
        dropCompanionTypes.add(companion);
      }
    }
  }

  // Imports stay when join apps still name the directive. Aliased Mesh
  // stitching source (`{name: "@source", as: "@meshSource"}`) is keyed by
  // join name `meshSource` - do not strip `@source` while that join / native lives.
  const importNamesToStrip = new Set(
    MESH_ORPHAN_DIRECTIVE_NAMES.filter(name => {
      if (usedNative.has(name) || joinCarried.has(name)) {
        return false;
      }
      if (name === 'source' && (joinCarried.has('meshSource') || usedNative.has('meshSource'))) {
        return false;
      }
      return true;
    }).map(name => `@${name}`),
  );
  if (dropDefs.size === 0 && importNamesToStrip.size === 0 && dropCompanionTypes.size === 0) {
    return document;
  }

  return {
    ...document,
    definitions: document.definitions
      .filter(def => {
        if (def.kind === Kind.DIRECTIVE_DEFINITION && dropDefs.has(def.name.value)) {
          return false;
        }
        if (
          (def.kind === Kind.ENUM_TYPE_DEFINITION || def.kind === Kind.SCALAR_TYPE_DEFINITION) &&
          dropCompanionTypes.has(def.name.value)
        ) {
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
 * `@join__directive`. Keep Mesh `@link` imports - join apps still name them.
 */
function pruneRewrittenMeshArtifacts(
  document: DocumentNode,
  rewrittenNames: Set<string>,
): DocumentNode {
  if (rewrittenNames.size === 0) {
    return document;
  }

  // Keep defs for any Mesh dir that still has native apps
  // (e.g. `@source` on ARGUMENT_DEFINITION - extract does not reconstitute those).
  const stillNative = new Set<string>();
  visit(document, {
    Directive(node) {
      if (rewrittenNames.has(node.name.value)) {
        stillNative.add(node.name.value);
      }
    },
  });

  const dropDefs = new Set([...rewrittenNames].filter(name => !stillNative.has(name)));
  const dropCompanionTypes = new Set<string>();
  for (const name of dropDefs) {
    for (const companion of MESH_PROTOCOL_COMPANION_TYPES[name] || []) {
      if (!documentReferencesTypeName(document, companion, { ignoreDirectiveDefs: dropDefs })) {
        dropCompanionTypes.add(companion);
      }
    }
  }

  return {
    ...document,
    definitions: document.definitions
      .filter(def => {
        if (def.kind === Kind.DIRECTIVE_DEFINITION && dropDefs.has(def.name.value)) {
          return false;
        }
        if (
          (def.kind === Kind.ENUM_TYPE_DEFINITION || def.kind === Kind.SCALAR_TYPE_DEFINITION) &&
          dropCompanionTypes.has(def.name.value)
        ) {
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
                  name === '@lookup' ||
                  name === '@is' ||
                  name === '@internal' ||
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

  const hasDirective = next.definitions.some(
    d => d.kind === Kind.DIRECTIVE_DEFINITION && d.name.value === 'join__directive',
  );
  const hasArgsScalar = next.definitions.some(
    d => d.kind === Kind.SCALAR_TYPE_DEFINITION && d.name.value === 'join__DirectiveArguments',
  );
  if (!hasDirective || !hasArgsScalar) {
    // Add only missing pieces - avoid duplicating join__DirectiveArguments when
    // the scalar already exists but the directive def does not (or vice versa).
    const extras = parse(JOIN_DIRECTIVE_DEFS, { noLocation: true });
    const toAdd = extras.definitions.filter(def => {
      if (def.kind === Kind.DIRECTIVE_DEFINITION && def.name.value === 'join__directive') {
        return !hasDirective;
      }
      if (
        def.kind === Kind.SCALAR_TYPE_DEFINITION &&
        def.name.value === 'join__DirectiveArguments'
      ) {
        return !hasArgsScalar;
      }
      return false;
    });
    if (toAdd.length) {
      next = {
        ...next,
        definitions: [...next.definitions, ...toAdd],
      };
    }
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

/**
 * Drop Mesh `@link(url: …)` with no `import:` (or an empty import list). These
 * are leftovers after transport/orphan import strip and carry no meaning on the
 * lean final SG.
 */
function pruneEmptyMeshLinks(document: DocumentNode): DocumentNode {
  return {
    ...document,
    definitions: document.definitions.map(def => {
      if (def.kind !== Kind.SCHEMA_DEFINITION && def.kind !== Kind.SCHEMA_EXTENSION) {
        return def;
      }
      if (!def.directives?.length) {
        return def;
      }
      const dirs = def.directives.filter(dir => {
        if (dir.name.value !== 'link') {
          return true;
        }
        if (!isMeshSpecLinkUrl(getStringArg(dir, 'url'))) {
          return true;
        }
        const importArg = dir.arguments?.find(a => a.name.value === 'import');
        if (!importArg) {
          return false;
        }
        if (importArg.value.kind === Kind.LIST && importArg.value.values.length === 0) {
          return false;
        }
        return true;
      });
      return dirs.length === def.directives.length ? def : { ...def, directives: dirs };
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
  // Empty import list → drop Mesh `@link` entirely (orphan url-only core/protocol
  // links are noise on the lean SG). Non-Mesh links keep url-only form.
  if (values.length === 0) {
    if (isMeshSpecLinkUrl(getStringArg(directive, 'url'))) {
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

function buildNativeTransportDirective(args: Record<string, unknown>): ConstDirectiveNode {
  const argumentNodes: Array<{
    kind: Kind.ARGUMENT;
    name: { kind: Kind.NAME; value: string };
    value: ConstValueNode;
  }> = [];
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined) continue;
    const valueNode = astFromValueUntyped(value) as ConstValueNode | null;
    if (valueNode == null) continue;
    argumentNodes.push({
      kind: Kind.ARGUMENT,
      name: { kind: Kind.NAME, value: key },
      value: valueNode,
    });
  }
  return {
    kind: Kind.DIRECTIVE,
    name: { kind: Kind.NAME, value: 'transport' },
    arguments: argumentNodes,
  };
}

function buildJoinDirective(
  graphEnum: string,
  name: string,
  args: Record<string, unknown>,
): ConstDirectiveNode {
  // Subgraph SDL may be multiline; join args stay compact single-line strings.
  const argsNode = astFromValueUntyped(prepareJoinDirectiveArgs(args)) as ConstValueNode;
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

function getEnumListArg(directive: ConstDirectiveNode, name: string): string[] {
  const arg = directive.arguments?.find(a => a.name.value === name);
  if (!arg) {
    return [];
  }
  if (arg.value.kind === Kind.ENUM) {
    return [arg.value.value];
  }
  if (arg.value.kind !== Kind.LIST) {
    return [];
  }
  const out: string[] = [];
  for (const v of arg.value.values) {
    if (v.kind === Kind.ENUM) {
      out.push(v.value);
    }
  }
  return out;
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
