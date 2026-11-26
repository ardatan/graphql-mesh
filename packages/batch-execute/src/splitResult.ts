// adapted from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-source-graphql/src/batching/merge-queries.js

import { relocatedError, type ExecutionResult } from '@graphql-tools/utils';
import { parseKey, parseKeyFromPath } from './prefix.js';

/**
 * Split and transform result of the query produced by the `merge` function
 */
export function splitResult(
  { data, errors }: ExecutionResult,
  numResults: number,
): Array<ExecutionResult> {
  const splitResults = new Array<ExecutionResult>(numResults);

  if (data) {
    for (const prefixedKey in data) {
      if (
        prefixedKey === '__proto__' ||
        prefixedKey === 'constructor' ||
        prefixedKey === 'prototype'
      ) {
        continue;
      }
      const { index, originalKey } = parseKey(prefixedKey);
      const result = splitResults[index];
      if (result == null) {
        splitResults[index] = {
          data: {
            [originalKey]: data[prefixedKey],
          },
        };
      } else if (result.data == null) {
        result.data = { [originalKey]: data[prefixedKey] };
      } else {
        result.data[originalKey] = data[prefixedKey];
      }
    }
  }

  if (errors) {
    for (const error of errors) {
      if (error.path) {
        const { index, originalKey, keyOffset } = parseKeyFromPath(error.path);
        const newError = relocatedError(error, [originalKey, ...error.path.slice(keyOffset)]);
        const splittedResult = splitResults[index];
        if (splittedResult == null) {
          splitResults[index] = { errors: [newError] };
          continue;
        } else if (splittedResult.errors == null) {
          splittedResult.errors = [newError];
          continue;
        } else {
          // @ts-expect-error - We know it is not readonly
          splittedResult.errors.push(newError);
        }
      } else {
        for (let i = 0; i < numResults; i++) {
          const splittedResult = splitResults[i];
          if (splittedResult == null) {
            splitResults[i] = { errors: [error] };
            continue;
          } else if (splittedResult.errors == null) {
            splittedResult.errors = [error];
            continue;
          } else {
            // @ts-expect-error - We know it is not readonly
            splittedResult.errors.push(error);
          }
        }
      }
    }
  }

  const isRootDataNull = data === null;

  // A batched response can omit some sub-requests entirely: if the merged result
  // carries neither a data key nor a path-scoped error for an index, that slot is
  // never assigned and stays a hole. A hole at the final slot makes the array fail
  // DataLoader's `isArrayLike` check (which requires `hasOwnProperty(length - 1)`),
  // even though `Array.isArray` is true — so `getBatchingExecutor`'s DataLoader
  // throws "did not return a Promise of an Array". Densify to `numResults` with an
  // empty result so every caller gets a well-formed `ExecutionResult`.
  //
  // A non-nullable field returning `null` propagates to the root `data`,
  // as per GraphQL's spec: https://spec.graphql.org/October2021/#sec-Handling-Field-Errors.
  // Batched sub-requests share one merged document so `null` propagates
  // to every result and not just the one whose fields actually failed.
  for (let i = 0; i < numResults; i++) {
    const splitResult = splitResults[i];
    if (splitResult == null) {
      splitResults[i] = { data: isRootDataNull ? null : {} };
    } else if (isRootDataNull && splitResult.data === undefined) {
      splitResult.data = null;
    }
  }

  return splitResults;
}
