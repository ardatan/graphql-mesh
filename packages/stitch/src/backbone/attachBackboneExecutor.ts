import { isObjectType, type GraphQLFieldResolver, type GraphQLSchema } from 'graphql';
import type { StitchingInfo } from '@graphql-tools/delegate';

export { attachBackboneExecutor, getBackboneExecutor } from './createBackboneExecutor.js';

type RootResolveSnapshot = Map<string, GraphQLFieldResolver<any, any> | undefined>;

/**
 * Snapshot Query/Mutation field `resolve` refs — compare after
 * `onStitchedSchema` / late resolver overrides to find changed roots.
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
 * replacing Query.me with a local). Mark them `localFields` so the planner
 * emits Islands instead of subgraph Fetches.
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
