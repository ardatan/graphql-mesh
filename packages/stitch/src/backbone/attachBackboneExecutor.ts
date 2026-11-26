import { isObjectType, type GraphQLFieldResolver, type GraphQLSchema } from 'graphql';
import type { StitchingInfo } from '@graphql-tools/delegate';
import type { Executor } from '@graphql-tools/utils';
import { createBackboneExecutor } from './createBackboneExecutor.js';
import { BACKBONE_EXECUTOR_OPTIONS_EXTENSION, type BackboneExecutorOptions } from './types.js';

/** Schema extension key for the operation-level backbone executor. */
export const BACKBONE_EXECUTOR_EXTENSION = 'backboneExecutor';

type RootResolveSnapshot = Map<string, GraphQLFieldResolver<any, any> | undefined>;

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
 * planner emits Islands instead of subgraph Fetches.
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
    }
  }
}

/**
 * Merge explicit attach options with values already on the schema
 * (`backboneExecutorOptions`, `overrideLabels`) so re-attach after `mapSchema`
 * can be optionless.
 */
export function resolveBackboneExecutorOptions(
  schema: GraphQLSchema,
  options: BackboneExecutorOptions = {},
): BackboneExecutorOptions {
  const stored = schema.extensions?.[BACKBONE_EXECUTOR_OPTIONS_EXTENSION] as
    BackboneExecutorOptions | undefined;
  return {
    handleProgressiveOverride:
      options.handleProgressiveOverride ?? stored?.handleProgressiveOverride,
    overrideLabels:
      options.overrideLabels ??
      stored?.overrideLabels ??
      (schema.extensions?.overrideLabels as Iterable<string> | undefined),
  };
}

/**
 * Install the stitching backbone on a schema:
 * - root Query/Mutation proxying resolvers (stock `graphql-js` execute -> backbone)
 * - `schema.extensions.backboneExecutor` for gateway / direct execute
 *
 * Call on the **final** schema after any `mapSchema` transforms that yield a
 * new schema instance (e.g. federation filter). Safe to call again to rebind;
 * progressive override opts persist on `schema.extensions` so later
 * re-attaches need no bag. Mesh `@pubsubPublish` belongs in fusion-runtime
 * (executor wrap), not here - do not mapSchema-wrap Mutation fields for it.
 */
export function attachBackboneExecutor(
  schema: GraphQLSchema,
  options: BackboneExecutorOptions = {},
): GraphQLSchema {
  const resolved = resolveBackboneExecutorOptions(schema, options);
  const executor = createBackboneExecutor(schema, resolved);
  schema.extensions = {
    ...schema.extensions,
    [BACKBONE_EXECUTOR_OPTIONS_EXTENSION]: resolved,
    [BACKBONE_EXECUTOR_EXTENSION]: executor,
  };
  return schema;
}

/** Read the backbone executor from schema extensions, if attached. */
export function getBackboneExecutor(schema: GraphQLSchema): Executor | undefined {
  return schema.extensions?.[BACKBONE_EXECUTOR_EXTENSION] as Executor | undefined;
}
