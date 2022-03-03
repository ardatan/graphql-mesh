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
import { MeshInstance } from '@graphql-mesh/runtime';
import { DocumentNode } from 'graphql';

const asyncIterator = typeof Symbol !== 'undefined' ? Symbol.asyncIterator : null;

const makeExecuteSource = (
  operation: Operation,
  mesh$: Promise<MeshInstance>,
  document: DocumentNode,
  variables: Record<string, any>,
  context: Record<string, any>,
  operationName: string,
  rootValue: any
): Source<OperationResult> => {
  return make<OperationResult>(observer => {
    let ended = false;

    Promise.resolve(mesh$)
      .then(mesh => {
        if (ended) return;
        if (operation.kind === 'subscription') {
          return mesh.subscribe(document, variables, context, rootValue, operationName);
        }
        return mesh.execute(document, variables, context, rootValue, operationName);
      })
      .then((result: ExecutionResult | AsyncIterable<ExecutionResult>) => {
        if (ended || !result) {
          return;
        } else if (!asyncIterator || !result[asyncIterator]) {
          observer.next(makeResult(operation, result as ExecutionResult));
          return;
        }

        const iterator: AsyncIterator<ExecutionResult> = result[asyncIterator!]();
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
          if (ended) {
            iterator.return && iterator.return();
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

/** Exchange for executing queries locally on a schema using graphql-js. */
export const meshExchange =
  (getBuiltMesh: () => Promise<MeshInstance>): Exchange =>
  ({ forward }) => {
    const mesh$ = getBuiltMesh();
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
              mesh$,
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
