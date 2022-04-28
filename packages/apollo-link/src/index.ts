import { ApolloLink, FetchResult, Observable, Operation } from '@apollo/client/core';
import { ExecuteMeshFn, SubscribeMeshFn } from '@graphql-mesh/runtime';
import { getOperationAST } from 'graphql';

export interface MeshApolloLinkOptions {
  execute: ExecuteMeshFn;
  subscribe?: SubscribeMeshFn;
}

export class MeshApolloLink extends ApolloLink {
  constructor(private options: MeshApolloLinkOptions) {
    super();
  }

  request(operation: Operation): Observable<FetchResult> {
    const operationAst = getOperationAST(operation.query, operation.operationName);
    if (!operationAst) {
      throw new Error('GraphQL operation not found');
    }
    return new Observable(observer => {
      Promise.resolve()
        .then(async () => {
          try {
            if (operationAst.operation === 'subscription') {
              const subscriptionResult = await this.options.subscribe(
                operation.query,
                operation.variables,
                operation.getContext(),
                {},
                operation.operationName
              );
              if (Symbol.asyncIterator in subscriptionResult) {
                for await (const result of subscriptionResult) {
                  if (observer.closed) {
                    return;
                  }
                  observer.next(result);
                }
                observer.complete();
              }
            } else {
              const result = await this.options.execute(
                operation.query,
                operation.variables,
                operation.getContext(),
                {},
                operation.operationName
              );

              if (!observer.closed) {
                observer.next(result);
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
  }
}
