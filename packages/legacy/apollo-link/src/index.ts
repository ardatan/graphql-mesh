import { getOperationAST } from 'graphql';
import * as apolloClient from '@apollo/client';
import { ExecuteMeshFn, SubscribeMeshFn } from '@graphql-mesh/runtime';
import { isAsyncIterable } from '@graphql-tools/utils';

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
      Promise.resolve()
        .then(async () => {
          const results = await operationFn(
            operation.query,
            operation.variables,
            operation.getContext(),
            ROOT_VALUE,
            operation.operationName,
          );
          if (isAsyncIterable(results)) {
            for await (const result of results) {
              if (observer.closed) {
                return;
              }
              observer.next(result);
            }
            observer.complete();
          } else {
            if (!observer.closed) {
              observer.next(results);
              observer.complete();
            }
          }
        })
        .catch(error => {
          if (!observer.closed) {
            observer.error(error);
          }
        });
    });
  };
}

export class MeshApolloLink extends apolloClient.ApolloLink {
  constructor(options: MeshApolloRequestHandlerOptions) {
    super(createMeshApolloRequestHandler(options));
  }
}
