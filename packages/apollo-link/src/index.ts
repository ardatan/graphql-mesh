import { ApolloLink, FetchResult, Observable, Operation } from '@apollo/client/core';
import { MeshInstance } from '@graphql-mesh/runtime';
import { getOperationAST } from 'graphql';

export class MeshApolloLink extends ApolloLink {
  mesh$: Promise<MeshInstance>;
  constructor(getBuiltMesh: () => Promise<MeshInstance>) {
    super();
    this.mesh$ = getBuiltMesh();
  }

  request(operation: Operation): Observable<FetchResult> {
    const operationAst = getOperationAST(operation.query, operation.operationName);
    if (!operationAst) {
      throw new Error('GraphQL operation not found');
    }
    return new Observable(observer => {
      Promise.resolve()
        .then(async () => {
          const mesh = await this.mesh$;
          try {
            if (operationAst.operation === 'subscription') {
              const subscriptionResult = await mesh.subscribe(
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
              const result = await mesh.execute(
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
