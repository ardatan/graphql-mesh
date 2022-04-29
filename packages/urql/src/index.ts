import { Source, pipe, share, filter, takeUntil, mergeMap, merge, make } from 'wonka';

import {
  Exchange,
  ExecutionResult,
  makeResult,
  makeErrorResult,
  mergeResultPatch,
  Operation,
  OperationResult,
  getOperationName,
} from '@urql/core';
import { ExecuteMeshFn, SubscribeMeshFn } from '@graphql-mesh/runtime';
import { DocumentNode } from 'graphql';
import { isAsyncIterable } from '@graphql-tools/utils';

const makeExecuteSource = (
  operation: Operation,
  options: MeshExchangeOptions,
  document: DocumentNode,
  variables: Record<string, any>,
  context: Record<string, any>,
  operationName: string,
  rootValue: any
): Source<OperationResult> => {
  const operationFn = operation.kind === 'subscription' ? options.subscribe : options.execute;
  return make<OperationResult>(observer => {
    let ended = false;
    operationFn(document, variables, context, rootValue, operationName)
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
              (prevResult = prevResult ? mergeResultPatch(prevResult, value) : makeResult(operation, value))
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
          return operation.kind === 'query' || operation.kind === 'mutation' || operation.kind === 'subscription';
        }),
        mergeMap((operation: Operation) => {
          const { key } = operation;
          const teardown$ = pipe(
            sharedOps$,
            filter(op => op.kind === 'teardown' && op.key === key)
          );

          return pipe(
            makeExecuteSource(
              operation,
              options,
              operation.query,
              operation.variables,
              {},
              getOperationName(operation.query)!,
              {}
            ),
            takeUntil(teardown$)
          );
        })
      );

      const forwardedOps$ = pipe(
        sharedOps$,
        filter(operation => operation.kind === 'teardown'),
        forward
      );

      return merge([executedOps$, forwardedOps$]);
    };
  };
