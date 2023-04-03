import { filter, make, merge, mergeMap, pipe, share, Source, takeUntil } from 'wonka';
import { ExecuteMeshFn, SubscribeMeshFn } from '@graphql-mesh/runtime';
import { isAsyncIterable } from '@graphql-tools/utils';
import {
  Exchange,
  ExecutionResult,
  makeErrorResult,
  makeResult,
  mergeResultPatch,
  Operation,
  OperationResult,
} from '@urql/core';

const ROOT_VALUE = {};
const makeExecuteSource = (
  operation: Operation,
  options: MeshExchangeOptions,
): Source<OperationResult> => {
  const operationFn = operation.kind === 'subscription' ? options.subscribe : options.execute;
  return make<OperationResult>(observer => {
    let ended = false;
    operationFn(operation.query, operation.variables, operation.context, ROOT_VALUE)
      .then((result: ExecutionResult | AsyncIterable<ExecutionResult>): any => {
        if (ended || !result) {
          return;
        } else if (!isAsyncIterable(result)) {
          observer.next(makeResult(operation, result));
          return;
        }

        const iterator: AsyncIterator<ExecutionResult> = result[Symbol.asyncIterator]();
        let prevResult: OperationResult | null = null;

        function next({ done, value }: { done?: boolean; value: ExecutionResult }): any {
          if (value) {
            observer.next(
              (prevResult = prevResult
                ? mergeResultPatch(prevResult, value)
                : makeResult(operation, value)),
            );
          }

          if (!done && !ended) {
            return iterator.next().then(next);
          }
          if (ended && iterator.return != null) {
            return iterator.return();
          }
        }

        return iterator.next().then(next);
      })
      .then(() => {
        observer.complete();
      })
      .catch(error => {
        observer.next(makeErrorResult(operation, error));
        observer.complete();
      });

    return () => {
      ended = true;
    };
  });
};

export interface MeshExchangeOptions {
  execute: ExecuteMeshFn;
  subscribe?: SubscribeMeshFn;
}

/** Exchange for executing queries locally on a schema using graphql-js. */
export const meshExchange =
  (options: MeshExchangeOptions): Exchange =>
  ({ forward }) => {
    return ops$ => {
      const sharedOps$ = share(ops$);

      const executedOps$ = pipe(
        sharedOps$,
        filter((operation: Operation) => {
          return (
            operation.kind === 'query' ||
            operation.kind === 'mutation' ||
            operation.kind === 'subscription'
          );
        }),
        mergeMap((operation: Operation) => {
          const { key } = operation;
          const teardown$ = pipe(
            sharedOps$,
            filter(op => op.kind === 'teardown' && op.key === key),
          );

          return pipe(makeExecuteSource(operation, options), takeUntil(teardown$));
        }),
      );

      const forwardedOps$ = pipe(
        sharedOps$,
        filter(operation => operation.kind === 'teardown'),
        forward,
      );

      return merge([executedOps$, forwardedOps$]);
    };
  };
