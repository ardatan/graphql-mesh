import { getOperationAST } from 'graphql';
import * as apolloClient from '@apollo/client';
import type { ExecuteMeshFn, SubscribeMeshFn } from '@graphql-mesh/runtime';
import { fakePromise, isAsyncIterable } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export interface MeshApolloRequestHandlerOptions {
  execute: ExecuteMeshFn;
  subscribe?: SubscribeMeshFn;
}

const ROOT_VALUE = {};
function createMeshApolloRequestHandler(
  options: MeshApolloRequestHandlerOptions,
): apolloClient.RequestHandler {
  return function meshApolloRequestHandler(
    operation: apolloClient.Operation,
  ): apolloClient.Observable<apolloClient.FetchResult> {
    const operationAst = getOperationAST(operation.query, operation.operationName);
    if (!operationAst) {
      throw new Error('GraphQL operation not found');
    }
    const operationFn =
      operationAst.operation === 'subscription' ? options.subscribe : options.execute;
    return new apolloClient.Observable(observer => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleMaybePromise(
        () =>
          operationFn(
            operation.query,
            operation.variables,
            operation.getContext(),
            ROOT_VALUE,
            operation.operationName,
          ),
        results => {
          if (isAsyncIterable(results)) {
            return fakePromise().then(async () => {
              for await (const result of results) {
                if (observer.closed) {
                  return;
                }
                observer.next(result);
              }
              observer.complete();
            });
          }
          if (!observer.closed) {
            observer.next(results);
            observer.complete();
          }
        },
        error => {
          if (!observer.closed) {
            observer.error(error);
          }
        },
      );
    });
  };
}

export class MeshApolloLink extends apolloClient.ApolloLink {
  constructor(options: MeshApolloRequestHandlerOptions) {
    super(createMeshApolloRequestHandler(options));
  }
}
