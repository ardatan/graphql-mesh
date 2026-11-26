import {
  GraphQLError,
  isAbstractType,
  locatedError,
  type FieldNode,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
  type SelectionSetNode,
} from 'graphql';
import {
  collectFields,
  memoize1,
  mergeDeep,
  pathToArray,
  promiseReduce,
  relocatedError,
} from '@graphql-tools/utils';
import { handleMaybePromise, isPromise, type MaybePromise } from '@whatwg-node/promise-helpers';
import { getCoercedVariableValues, getVariableValues } from './getCoercedVariableValues.js';
import { setOwnProp } from './isPrototypePollutingKey.js';
import { leftOverByDelegationPlan, PLAN_LEFT_OVER } from './leftOver.js';
import { type Subschema } from './Subschema.js';
import {
  FIELD_SUBSCHEMA_MAP_SYMBOL,
  OBJECT_SUBSCHEMA_SYMBOL,
  UNPATHED_ERRORS_SYMBOL,
} from './symbols.js';
import { type ExternalObject, type MergedTypeInfo, type SubschemaConfig } from './types.js';

export function isExternalObject(data: any): data is ExternalObject {
  return data[UNPATHED_ERRORS_SYMBOL] !== undefined;
}

export function annotateExternalObject<TContext>(
  object: any,
  errors: Array<GraphQLError>,
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext> | undefined,
  subschemaMap: Record<string, GraphQLSchema | SubschemaConfig<any, any, any, Record<string, any>>>,
): ExternalObject {
  Object.defineProperties(object, {
    [OBJECT_SUBSCHEMA_SYMBOL]: { value: subschema, writable: true },
    [FIELD_SUBSCHEMA_MAP_SYMBOL]: { value: subschemaMap, writable: true },
    [UNPATHED_ERRORS_SYMBOL]: { value: errors, writable: true },
  });
  return object;
}

export function getSubschema(
  object: ExternalObject,
  responseKey: string,
): GraphQLSchema | SubschemaConfig {
  return object[FIELD_SUBSCHEMA_MAP_SYMBOL]?.[responseKey] ?? object[OBJECT_SUBSCHEMA_SYMBOL];
}

export function getUnpathedErrors(object: ExternalObject): Array<GraphQLError> {
  return object[UNPATHED_ERRORS_SYMBOL];
}

export const EMPTY_OBJECT = Object.create(null);

export const getActualFieldNodes = memoize1(function (fieldNode: FieldNode) {
  return [fieldNode];
});

export function mergeFields<TContext>(
  mergedTypeInfo: MergedTypeInfo,
  object: any,
  sourceSubschema: Subschema<any, any, any, TContext>,
  context: any,
  info: GraphQLResolveInfo,
  fieldNodes = info.fieldNodes as FieldNode[],
  skipSubschema?: (subschema: Subschema) => boolean,
): MaybePromise<any> {
  const variableValues = getCoercedVariableValues(info.variableValues);
  const delegationMaps = mergedTypeInfo.delegationPlanBuilder(
    info.schema,
    sourceSubschema,
    variableValues != null && Object.keys(variableValues).length > 0
      ? variableValues
      : EMPTY_OBJECT,
    info.fragments != null && Object.keys(info.fragments).length > 0
      ? info.fragments
      : EMPTY_OBJECT,
    fieldNodes.length === 1 && fieldNodes[0] ? getActualFieldNodes(fieldNodes[0]) : fieldNodes,
    context,
    info,
    object,
  );

  const leftOver = leftOverByDelegationPlan.get(delegationMaps);
  if (leftOver) {
    // Symbol key — cannot pollute Object.prototype
    Reflect.set(object, PLAN_LEFT_OVER, leftOver);
  }

  return handleMaybePromise(
    () =>
      promiseReduce<Map<Subschema, SelectionSetNode>, any>(
        delegationMaps,
        (_, delegationMap) =>
          executeDelegationStage(
            mergedTypeInfo,
            skipSubschema
              ? new Map(
                  Array.from(delegationMap).filter(([subschema]) => !skipSubschema(subschema)),
                )
              : delegationMap,
            object,
            context,
            info,
          ),
        undefined,
      ),
    () => object,
  );
}

export function handleResolverResult(
  resolverResult: any,
  subschema: Subschema,
  selectionSet: SelectionSetNode,
  object: ExternalObject,
  combinedFieldSubschemaMap: Record<
    string,
    GraphQLSchema | SubschemaConfig<any, any, any, Record<string, any>>
  >,
  info: GraphQLResolveInfo,
  path: Array<string | number>,
  combinedErrors: Array<GraphQLError>,
) {
  if (resolverResult instanceof Error || resolverResult == null) {
    const schema = subschema.transformedSchema || info.schema;
    const type = schema.getType(object.__typename) as GraphQLObjectType;
    const { fields } = collectFields(
      schema,
      info.fragments,
      getVariableValues(info.variableValues),
      type,
      selectionSet,
    );
    const nullResult: Record<string, any> = {};
    for (const [responseKey, fieldNodes] of fields) {
      const combinedPath = [...path, responseKey];
      if (resolverResult instanceof GraphQLError) {
        if (resolverResult.message.includes('Cannot return null for non-nullable field')) {
          nullResult[responseKey] = null;
        } else {
          nullResult[responseKey] = relocatedError(resolverResult, combinedPath);
        }
      } else if (resolverResult instanceof Error) {
        nullResult[responseKey] = locatedError(resolverResult, fieldNodes, combinedPath);
      } else {
        nullResult[responseKey] = null;
      }
    }
    resolverResult = nullResult;
  } else {
    if (resolverResult[UNPATHED_ERRORS_SYMBOL]) {
      combinedErrors.push(...resolverResult[UNPATHED_ERRORS_SYMBOL]);
    }
  }

  const objectSubschema = resolverResult[OBJECT_SUBSCHEMA_SYMBOL];
  const fieldSubschemaMap = resolverResult[FIELD_SUBSCHEMA_MAP_SYMBOL];
  for (const responseKey in resolverResult) {
    // Only __proto__ is unsafe as a response key; constructor/prototype are
    // valid GraphQL field/alias names and must be preserved via own-property
    // writes (setOwnProp / defineProperty). Skip inherited enumerable junk.
    if (
      responseKey === '__proto__' ||
      !Object.prototype.hasOwnProperty.call(resolverResult, responseKey)
    ) {
      continue;
    }
    const existingPropValue = object[responseKey];
    const sourcePropValue = resolverResult[responseKey];
    if (
      responseKey === '__typename' &&
      existingPropValue !== sourcePropValue &&
      isAbstractType(subschema.transformedSchema.getType(sourcePropValue))
    ) {
      continue;
    }
    if (sourcePropValue != null || existingPropValue == null) {
      if (
        existingPropValue != null &&
        typeof existingPropValue === 'object' &&
        !(existingPropValue instanceof Error) &&
        Object.keys(existingPropValue).length > 0
      ) {
        if (
          Array.isArray(existingPropValue) &&
          Array.isArray(sourcePropValue) &&
          existingPropValue.length === sourcePropValue.length
        ) {
          setOwnProp(
            object,
            responseKey,
            existingPropValue.map((existingElement, index) =>
              sourcePropValue instanceof Error
                ? existingElement
                : mergeDeep([existingElement, sourcePropValue[index]], undefined, true, true),
            ),
          );
        } else if (!(sourcePropValue instanceof Error)) {
          setOwnProp(
            object,
            responseKey,
            mergeDeep([existingPropValue, sourcePropValue], undefined, true, true),
          );
        }
      } else {
        setOwnProp(object, responseKey, sourcePropValue);
      }
    }
    setOwnProp(
      combinedFieldSubschemaMap,
      responseKey,
      fieldSubschemaMap?.[responseKey] ?? objectSubschema ?? subschema,
    );
  }
}

function executeDelegationStage(
  mergedTypeInfo: MergedTypeInfo,
  delegationMap: Map<Subschema, SelectionSetNode>,
  object: ExternalObject,
  context: any,
  info: GraphQLResolveInfo,
): MaybePromise<void> {
  const combinedErrors = object[UNPATHED_ERRORS_SYMBOL];

  const path = pathToArray(info.path);

  const combinedFieldSubschemaMap = object[FIELD_SUBSCHEMA_MAP_SYMBOL];

  const jobs: Promise<any>[] = [];
  for (const [subschema, selectionSet] of delegationMap) {
    const schema = subschema.transformedSchema || info.schema;
    const type = schema.getType(object.__typename) as GraphQLObjectType;
    const resolver = mergedTypeInfo.resolvers.get(subschema);
    if (resolver) {
      try {
        const resolverResult$ = resolver(
          object,
          context,
          info,
          subschema,
          selectionSet,
          undefined,
          type,
        );
        if (isPromise(resolverResult$)) {
          jobs.push(
            resolverResult$.then(
              resolverResult =>
                handleResolverResult(
                  resolverResult,
                  subschema,
                  selectionSet,
                  object,
                  combinedFieldSubschemaMap,
                  info,
                  path,
                  combinedErrors,
                ),
              error =>
                handleResolverResult(
                  error,
                  subschema,
                  selectionSet,
                  object,
                  combinedFieldSubschemaMap,
                  info,
                  path,
                  combinedErrors,
                ),
            ),
          );
        } else {
          handleResolverResult(
            resolverResult$,
            subschema,
            selectionSet,
            object,
            combinedFieldSubschemaMap,
            info,
            path,
            combinedErrors,
          );
        }
      } catch (error) {
        handleResolverResult(
          error,
          subschema,
          selectionSet,
          object,
          combinedFieldSubschemaMap,
          info,
          path,
          combinedErrors,
        );
      }
    }
  }

  if (jobs.length) {
    if (jobs.length === 1) {
      return jobs[0];
    }
    return Promise.all(jobs) as any;
  }
}
