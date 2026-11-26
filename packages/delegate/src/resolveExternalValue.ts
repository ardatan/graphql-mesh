import {
  getNullableType,
  isAbstractType,
  isCompositeType,
  isLeafType,
  isListType,
  locatedError,
  type GraphQLCompositeType,
  type GraphQLError,
  type GraphQLList,
  type GraphQLOutputType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
} from 'graphql';
import type { Maybe } from '@graphql-tools/utils';
import { handleMaybePromise, isPromise } from '@whatwg-node/promise-helpers';
import { annotateExternalObject, isExternalObject, mergeFields } from './mergeFields.js';
import { type Subschema } from './Subschema.js';
import {
  type ExternalObject,
  type MergedTypeInfo,
  type StitchingInfo,
  type SubschemaConfig,
} from './types.js';

// V8 (Node 24): ~32 B per empty map vs ~192 B for Object.create(null).
const CompactFieldSubschemaMap =
  function CompactFieldSubschemaMap() {} as unknown as new () => object;

export function resolveExternalValue<TContext extends Record<string, any>>(
  result: any,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
  context?: Record<string, any>,
  info?: GraphQLResolveInfo,
  returnType = getReturnType(info),
  skipTypeMerging?: boolean,
): any {
  const type = getNullableType(returnType);

  if (result instanceof Error) {
    return result;
  }

  if (result == null) {
    return reportUnpathedErrorsViaNull(unpathedErrors);
  }

  if (isLeafType(type)) {
    // Gateway doesn't need to know about errors in leaf values
    // If an enum value is invalid, it is an subschema error not a gateway error
    try {
      return type.parseValue(result);
    } catch {
      return null;
    }
  } else if (isCompositeType(type)) {
    const resolved = resolveExternalObject(
      type,
      result,
      unpathedErrors,
      subschema,
      context,
      info,
      skipTypeMerging,
    );
    if (!isPromise(resolved)) {
      return validateCompositeResult(resolved, type, info);
    }
    return handleMaybePromise(
      () => resolved,
      value => validateCompositeResult(value, type, info),
    );
  } else if (isListType(type)) {
    if (Array.isArray(result)) {
      return resolveExternalList(
        type,
        result,
        unpathedErrors,
        subschema,
        context,
        info,
        skipTypeMerging,
      );
    }
    return resolveExternalValue(
      result,
      unpathedErrors,
      subschema,
      context,
      info,
      type.ofType,
      skipTypeMerging,
    );
  }
}

function validateCompositeResult(
  value: ExternalObject,
  type: GraphQLCompositeType,
  info: GraphQLResolveInfo | undefined,
): ExternalObject | null {
  if (info && isAbstractType(type)) {
    if (value.__typename != null) {
      const resolvedType = info.schema.getType(value.__typename);
      if (!resolvedType) return null;
    }
    return value;
  }
  return value;
}

function resolveExternalObject<TContext extends Record<string, any>>(
  type: GraphQLCompositeType,
  object: any,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
  context?: Record<string, any>,
  info?: GraphQLResolveInfo,
  skipTypeMerging?: boolean,
) {
  // if we have already resolved this object, for example, when the identical object appears twice
  // in a list, see https://github.com/ardatan/graphql-tools/issues/2304
  if (!isExternalObject(object)) {
    annotateExternalObject(
      object,
      unpathedErrors,
      subschema,
      Object.setPrototypeOf(new CompactFieldSubschemaMap(), null),
    );
  }
  if (skipTypeMerging || info == null) {
    return object;
  }

  const stitchingInfo = info.schema.extensions?.stitchingInfo as Maybe<StitchingInfo>;

  if (stitchingInfo == null) {
    return object;
  }

  // Within the stitching context, delegation to a stitched GraphQLSchema or SubschemaConfig
  // will be redirected to the appropriate Subschema object, from which merge targets can be queried.

  let mergedTypeInfo: MergedTypeInfo | undefined;
  const possibleTypeNames = [object.__typename, type.name];
  for (const possibleTypeName of possibleTypeNames) {
    if (
      possibleTypeName != null &&
      stitchingInfo.mergedTypes[possibleTypeName]?.targetSubschemas?.get(subschema as Subschema)
        ?.length
    ) {
      mergedTypeInfo = stitchingInfo.mergedTypes[possibleTypeName];
      break;
    }
  }

  if (!mergedTypeInfo) {
    for (const possibleTypeName of possibleTypeNames) {
      const potentialMergedTypeInfo = stitchingInfo.mergedTypes[possibleTypeName];
      if (potentialMergedTypeInfo != null) {
        let matched = false;
        for (const [
          sourceSubschema,
          targetSubschemas,
        ] of potentialMergedTypeInfo.targetSubschemas) {
          if (
            targetSubschemas.length &&
            sourceSubschema.name != null &&
            sourceSubschema.name === (subschema as Subschema).name
          ) {
            subschema = sourceSubschema as SubschemaConfig<any, any, any, TContext>;
            mergedTypeInfo = potentialMergedTypeInfo;
            matched = true;
            break;
          }
        }
        // Continue past merge metadata with no matching source; exit only after a match.
        if (matched) {
          break;
        }
      }
    }
  }

  // If there are no merge targets from the subschema, return.
  if (!mergedTypeInfo) {
    return object;
  }

  // the abstract type can have merge targets that dont know the concrete type at all,
  // like an @interfaceObject subgraph. those are reachable only through the abstract
  // type so we merge it too, otherwise their fields resolve to null
  const abstractMergedTypeInfo =
    mergedTypeInfo.typeName === type.name ? undefined : stitchingInfo.mergedTypes[type.name];
  const knowsConcreteType = (targetSubschema: Subschema) =>
    !!targetSubschema.transformedSchema.getType(object.__typename);
  if (
    abstractMergedTypeInfo?.targetSubschemas
      .get(subschema as Subschema)
      ?.some(targetSubschema => !knowsConcreteType(targetSubschema))
  ) {
    return handleMaybePromise(
      () => mergeFields(mergedTypeInfo, object, subschema as Subschema, context, info),
      () =>
        mergeFields(
          abstractMergedTypeInfo,
          object,
          subschema as Subschema,
          context,
          info,
          undefined,
          // the concrete merge above already covered these
          knowsConcreteType,
        ),
    );
  }

  return mergeFields(mergedTypeInfo, object, subschema as Subschema, context, info);
}

function resolveExternalList<TContext extends Record<string, any>>(
  type: GraphQLList<any>,
  list: Array<any>,
  unpathedErrors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
  context?: Record<string, any>,
  info?: GraphQLResolveInfo,
  skipTypeMerging?: boolean,
) {
  return list.map(listMember =>
    resolveExternalValue(
      listMember,
      unpathedErrors,
      subschema,
      context,
      info,
      type.ofType,
      skipTypeMerging,
    ),
  );
}

const reportedErrors = new WeakSet<GraphQLError>();

function reportUnpathedErrorsViaNull(unpathedErrors: Array<GraphQLError>) {
  if (unpathedErrors.length) {
    const unreportedErrors: Array<GraphQLError> = [];
    for (const error of unpathedErrors) {
      if (!reportedErrors.has(error)) {
        unreportedErrors.push(error);
        reportedErrors.add(error);
      }
    }

    if (unreportedErrors.length) {
      const unreportedError = unreportedErrors[0];
      if (unreportedErrors.length === 1 && unreportedError) {
        return locatedError(unreportedError, undefined, unreportedError.path);
      }

      return new AggregateError(
        unreportedErrors.map(e => locatedError(e, undefined, e.path)),
        unreportedErrors.map(error => error.message).join(', \n'),
      );
    }
  }

  return null;
}

function getReturnType(info: GraphQLResolveInfo | undefined): GraphQLOutputType {
  if (info == null) {
    throw new Error(`Return type cannot be inferred without a source schema.`);
  }
  return info.returnType;
}
