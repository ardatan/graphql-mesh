import {
  responsePathAsArray,
  type GraphQLError,
  type GraphQLOutputType,
  type GraphQLResolveInfo,
} from 'graphql';
import { relocatedError, type ExecutionResult } from '@graphql-tools/utils';
import { resolveExternalValue } from './resolveExternalValue.js';
import { type DelegationContext } from './types.js';

export function checkResultAndHandleErrors<TContext extends Record<string, any>>(
  // TODO: investigate the reason
  result: ExecutionResult = {
    data: null,
    errors: [],
  },
  delegationContext: DelegationContext<TContext>,
): any {
  const {
    context,
    info,
    fieldName: responseKey = getResponseKey(info),
    subschema,
    returnType = getReturnType(info),
    skipTypeMerging,
    onLocatedError,
  } = delegationContext;

  const { data, unpathedErrors } = mergeDataAndErrors(
    result.data == null ? undefined : result.data[responseKey],
    result.errors == null ? [] : result.errors,
    info != null && info.path ? responsePathAsArray(info.path) : undefined,
    onLocatedError,
  );

  return resolveExternalValue(
    data,
    unpathedErrors,
    subschema,
    context,
    info,
    returnType,
    skipTypeMerging,
  );
}

export function mergeDataAndErrors(
  data: any,
  errors: ReadonlyArray<GraphQLError>,
  path: Array<string | number> | undefined,
  onLocatedError?: (originalError: GraphQLError) => GraphQLError,
  index = 1,
): { data: any; unpathedErrors: Array<GraphQLError> } {
  if (data == null) {
    if (!errors.length) {
      return { data: null, unpathedErrors: [] };
    }

    if (errors.length === 1 && errors[0]) {
      const error = onLocatedError ? onLocatedError(errors[0]) : errors[0];
      const newPath =
        path === undefined ? error.path : !error.path ? path : path.concat(error.path.slice(1));

      // Relocate the error returned by onLocatedError (not the original).
      return { data: relocatedError(error, newPath), unpathedErrors: [] };
    }

    const rewrittenErrors = errors.map(e => {
      const error = onLocatedError ? onLocatedError(e) : e;
      const newPath =
        path === undefined ? error.path : !error.path ? path : path.concat(error.path.slice(1));
      return relocatedError(error, newPath);
    });
    const combinedError = new AggregateError(
      rewrittenErrors,
      rewrittenErrors.map(error => error.message).join(',\n'),
    );

    return { data: combinedError, unpathedErrors: [] };
  }

  if (!errors.length) {
    return { data, unpathedErrors: [] };
  }

  const unpathedErrors: Array<GraphQLError> = [];

  const errorMap = new Map<string | number, Array<GraphQLError>>();
  for (const error of errors) {
    const pathSegment = error.path?.[index];
    if (pathSegment != null) {
      let pathSegmentErrors = errorMap.get(pathSegment);
      if (pathSegmentErrors === undefined) {
        pathSegmentErrors = [error];
        errorMap.set(pathSegment, pathSegmentErrors);
      } else {
        pathSegmentErrors.push(error);
      }
    } else {
      unpathedErrors.push(error);
    }
  }

  for (const [pathSegment, pathSegmentErrors] of errorMap) {
    if (data[pathSegment] !== undefined) {
      const { data: newData, unpathedErrors: newErrors } = mergeDataAndErrors(
        data[pathSegment],
        pathSegmentErrors,
        path,
        onLocatedError,
        index + 1,
      );
      data[pathSegment] = newData;
      unpathedErrors.push(...newErrors);
    } else {
      unpathedErrors.push(...pathSegmentErrors);
    }
  }

  return { data, unpathedErrors };
}

function getResponseKey(info: GraphQLResolveInfo | undefined): string {
  if (info == null) {
    throw new Error(
      `Data cannot be extracted from result without an explicit key or source schema.`,
    );
  }
  return info.fieldNodes[0]!.alias?.value ?? info.fieldName;
}

function getReturnType(info: GraphQLResolveInfo | undefined): GraphQLOutputType {
  if (info == null) {
    throw new Error(`Return type cannot be inferred without a source schema.`);
  }
  return info.returnType;
}
