import {
  defaultFieldResolver,
  isObjectType,
  type GraphQLFieldResolver,
  type GraphQLSchema,
} from 'graphql';
import type { StitchingInfo } from '@graphql-tools/delegate';
import type { Executor } from '@graphql-tools/utils';
import {
  createBackboneExecutor,
  getBackboneRuntime,
  type BackboneRuntime,
} from './createBackboneExecutor.js';
import { installRootProxyingResolvers } from './rootProxyingResolvers.js';

type RootResolveSnapshot = Map<string, GraphQLFieldResolver<any, any> | undefined>;

/**
 * Per-schema executor records. `mapSchema` reuses the same null-prototype
 * `extensions` object (and shared `stitchingInfo`), so the executor must not
 * live there — attaching a mapped copy would overwrite
 * `getBackboneExecutor(original)`.
 */
const backboneExecutors = new WeakMap<GraphQLSchema, Executor>();

/**
 * Shared across `mapSchema` copies via the same `stitchingInfo` object so
 * `retargetBackboneToSchema` can find the live runtime after filter /
 * `onStitchedSchema` without storing the executor on stitchingInfo itself.
 */
const backboneRuntimeByStitchingInfo = new WeakMap<object, BackboneRuntime>();

/**
 * Snapshot Query/Mutation field `resolve` refs - compare after
 * `onStitchedSchema` / late `addResolversToSchema` to find overrides.
 */
export function snapshotRootFieldResolves(schema: GraphQLSchema): RootResolveSnapshot {
  const snap: RootResolveSnapshot = new Map();
  for (const root of [schema.getQueryType(), schema.getMutationType()]) {
    if (!root || !isObjectType(root)) {
      continue;
    }
    for (const [fieldName, field] of Object.entries(root.getFields())) {
      snap.set(`${root.name}.${fieldName}`, field.resolve);
    }
  }
  return snap;
}

/**
 * Fields whose `resolve` changed since `before` are gateway overrides (e.g.
 * ApolloServer test replacing Query.me). Mark them `localFields` so the
 * planner emits Islands instead of subgraph Fetches. Also stamp
 * `ORIGINAL_RESOLVE` to the override so Islands call it (not the pre-proxy
 * subgraph resolver closed over at stitch time).
 */
export function markChangedRootResolvesAsLocal(
  schema: GraphQLSchema,
  before: RootResolveSnapshot,
): void {
  const stitchingInfo = schema.extensions?.stitchingInfo as StitchingInfo | undefined;
  if (!stitchingInfo) {
    return;
  }
  if (!stitchingInfo.localFields) {
    stitchingInfo.localFields = new Map();
  }
  const ORIGINAL_RESOLVE = Symbol.for('graphql-tools.stitch.backboneOriginalResolve');
  for (const root of [schema.getQueryType(), schema.getMutationType()]) {
    if (!root || !isObjectType(root)) {
      continue;
    }
    let locals = stitchingInfo.localFields.get(root.name);
    for (const [fieldName, field] of Object.entries(root.getFields())) {
      const key = `${root.name}.${fieldName}`;
      if (before.get(key) === field.resolve) {
        continue;
      }
      if (!locals) {
        locals = new Set();
        stitchingInfo.localFields.set(root.name, locals);
      }
      locals.add(fieldName);
      // Island uses getOriginalRootResolve — must be the late override.
      (field as any)[ORIGINAL_RESOLVE] = field.resolve ?? defaultFieldResolver;
    }
  }
}

/**
 * Install the stitching backbone on a schema:
 * - root Query/Mutation proxying resolvers (stock `graphql-js` execute -> backbone)
 * - per-schema `getBackboneExecutor` record (WeakMap — not shared `stitchingInfo`)
 *
 * Progressive-override inputs are closed over from `options` (from
 * `stitchSchemas`), not stored on shared `stitchingInfo`. Identity / filter
 * `mapSchema` keeps root proxies; attaching a derived schema does not
 * overwrite `getBackboneExecutor(original)`. Mesh `@pubsubPublish` belongs
 * in fusion-runtime (executor wrap), not here.
 */
export function attachBackboneExecutor(
  schema: GraphQLSchema,
  options?: {
    overrideLabels?: Iterable<string>;
    handleProgressiveOverride?: (label: string, context: any) => boolean | Promise<boolean>;
  },
): GraphQLSchema {
  const executor = createBackboneExecutor(schema, options);
  backboneExecutors.set(schema, executor);
  const runtime = getBackboneRuntime(executor);
  const stitchingInfo = schema.extensions?.stitchingInfo;
  if (runtime && stitchingInfo && typeof stitchingInfo === 'object') {
    backboneRuntimeByStitchingInfo.set(stitchingInfo, runtime);
  }
  return schema;
}

/** Read the backbone executor attached to this schema instance, if any. */
export function getBackboneExecutor(schema: GraphQLSchema): Executor | undefined {
  return backboneExecutors.get(schema);
}

/**
 * Point the existing backbone runtime at `schema` after `mapSchema` / late
 * root overrides. Reuses the same executor (progressive-override closure
 * intact) — does not create a new executor or store options on stitchingInfo.
 */
export function retargetBackboneToSchema(schema: GraphQLSchema): GraphQLSchema {
  const stitchingInfo = schema.extensions?.stitchingInfo;
  const runtime =
    (stitchingInfo && typeof stitchingInfo === 'object'
      ? backboneRuntimeByStitchingInfo.get(stitchingInfo)
      : undefined) ?? undefined;
  if (!runtime) {
    return schema;
  }
  runtime.setSchema(schema);
  backboneExecutors.set(schema, runtime.executor);
  installRootProxyingResolvers(schema, runtime.executor);
  return schema;
}
