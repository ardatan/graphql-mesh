import { isObjectType, type GraphQLFieldResolver, type GraphQLSchema } from 'graphql';
import type { StitchingInfo } from '@graphql-tools/delegate';
import type { Executor } from '@graphql-tools/utils';
import { createBackboneExecutor } from './createBackboneExecutor.js';

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
 * Install the stitching backbone on a schema:
 * - root Query/Mutation proxying resolvers (stock `graphql-js` execute -> backbone)
 * - `stitchingInfo.backboneExecutor` for gateway / direct execute
 *
 * Progressive-override inputs must already live flat on `stitchingInfo`
 * (`overrideLabels` / `handleProgressiveOverride`) — typically written by
 * `stitchSchemas`. Call on the **final** schema after any `mapSchema`
 * transforms that yield a new schema instance (e.g. federation filter). Safe
 * to call again to rebind. Mesh `@pubsubPublish` belongs in fusion-runtime
 * (executor wrap), not here.
 */
export function attachBackboneExecutor(schema: GraphQLSchema): GraphQLSchema {
  const executor = createBackboneExecutor(schema);
  const stitchingInfo = schema.extensions?.stitchingInfo as StitchingInfo | undefined;
  if (stitchingInfo) {
    stitchingInfo.backboneExecutor = executor;
  }
  return schema;
}

/** Read the backbone executor from `stitchingInfo`, if attached. */
export function getBackboneExecutor(schema: GraphQLSchema): Executor | undefined {
  const stitchingInfo = schema.extensions?.stitchingInfo as StitchingInfo | undefined;
  return stitchingInfo?.backboneExecutor;
}
