import { ApolloLink, FetchResult, Observable, Operation, RequestHandler } from '@apollo/client/core';
import { ExecuteMeshFn, SubscribeMeshFn } from '@graphql-mesh/runtime';
import { isAsyncIterable } from '@graphql-tools/utils';
import { getOperationAST } from 'graphql';

export interface MeshApolloRequestHandlerOptions {
  execute: ExecuteMeshFn;
  subscribe?: SubscribeMeshFn;
}

function createMeshApolloRequestHandler(options: MeshApolloRequestHandlerOptions): RequestHandler {
  return function meshApolloRequestHandler(operation: Operation): Observable<FetchResult> {
    const operationAst = getOperationAST(operation.query, operation.operationName);
    if (!operationAst) {
      throw new Error('GraphQL operation not found');
    }
    const operationFn = operationAst.operation === 'subscription' ? options.subscribe : options.execute;
    return new Observable(observer => {
      Promise.resolve()
        .then(async () => {
          try {
            const results = await operationFn(
              operation.query,
              operation.variables,
              operation.getContext(),
              {},
              operation.operationName
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
          } catch (error) {
            if (!observer.closed) {
              observer.error(error);
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

export class MeshApolloLink extends ApolloLink {
  constructor(options: MeshApolloRequestHandlerOptions) {
    super(createMeshApolloRequestHandler(options));
  }
}
