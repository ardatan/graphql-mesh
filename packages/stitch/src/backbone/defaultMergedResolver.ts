import {
  defaultFieldResolver,
  getNamedType,
  type GraphQLFieldResolver,
  type GraphQLResolveInfo,
} from 'graphql';
import {
  getSubschema,
  getUnpathedErrors,
  isExternalObject,
  resolveExternalValue,
  type ExternalObject,
  type StitchingInfo,
} from '@graphql-tools/delegate';
import { resolveLocalFieldResult } from '../resolveLocalFieldResult.js';

/**
 * Gateway default field resolver for stitched schemas (backbone era).
 *
 * Function name stays `defaultMergedResolver` so graphql-tools checks that key
 * off `resolve.name` (e.g. prepareGatewayDocument) still treat these fields as
 * default/proxy rather than additional resolvers.
 *
 * Unlike the classic leftover/`mergeFields` implementation in
 * `@graphql-tools/delegate`, this does **not** run merge plans at resolve time
 * - those hops belong on the stitch plan. It:
 * - reads alias response keys on ExternalObjects (+ `resolveExternalValue`)
 * - falls back to literal field names (plain graphql-js semantics)
 * - runs `resolveLocalFieldResult` when the return type is merged, so
 *   property-only gateway locals (FlattenedTransactions.page) hydrate without
 *   a per-field `wrappedResolve`
 */
export const defaultMergedResolver: GraphQLFieldResolver<any, any> = function defaultMergedResolver(
  parent: ExternalObject | Record<string, any> | null | undefined,
  args: Record<string, any>,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
) {
  if (parent == null) {
    return null;
  }

  const value = readParentField(parent, args, context, info);
  return hydrateIfMerged(value, context, info);
};

function readParentField(
  parent: ExternalObject | Record<string, any>,
  args: Record<string, any>,
  context: Record<string, any>,
  info: GraphQLResolveInfo,
): any {
  if (!isExternalObject(parent)) {
    // Prefer alias key when delegated/plain data was stored under the response key.
    const responseKey = info.fieldNodes[0]?.alias?.value ?? info.fieldName;
    if (
      responseKey !== info.fieldName &&
      Object.prototype.hasOwnProperty.call(parent, responseKey)
    ) {
      return parent[responseKey];
    }
    return defaultFieldResolver(parent, args, context, info);
  }

  const responseKey = info.fieldNodes[0]!.alias?.value ?? info.fieldName;

  if (Object.prototype.hasOwnProperty.call(parent, responseKey)) {
    return resolveExternalValue(
      parent[responseKey],
      getUnpathedErrors(parent),
      getSubschema(parent, responseKey),
      context,
      info,
    );
  }

  if (Object.prototype.hasOwnProperty.call(parent, info.fieldName)) {
    return defaultFieldResolver(parent, args, context, info);
  }

  return undefined;
}

function hydrateIfMerged(value: any, context: Record<string, any>, info: GraphQLResolveInfo): any {
  const stitchingInfo = info.schema.extensions?.stitchingInfo as StitchingInfo | undefined;
  if (stitchingInfo == null || value == null) {
    return value;
  }
  const returnTypeName = getNamedType(info.returnType).name;
  if (stitchingInfo.mergedTypes[returnTypeName] == null) {
    return value;
  }
  const provided = stitchingInfo.localFields?.get(returnTypeName);
  return resolveLocalFieldResult(value, context, info, stitchingInfo, provided);
}
