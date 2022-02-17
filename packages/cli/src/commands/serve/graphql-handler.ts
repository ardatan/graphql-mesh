import { getMesh } from '@graphql-mesh/runtime';
import { parseWithCache } from '@graphql-mesh/utils';
import { RequestHandler } from 'express';
import { getGraphQLParameters, processRequest, sendResult, shouldRenderGraphiQL } from 'graphql-helix';

export const graphqlHandler = (mesh$: ReturnType<typeof getMesh>): RequestHandler =>
  function (request, response, next) {
    // Determine whether we should render GraphiQL instead of returning an API response
    if (shouldRenderGraphiQL(request)) {
      next();
    } else {
      // Extract the GraphQL parameters from the request
      const { operationName, query, variables } = getGraphQLParameters(request);
      mesh$
        .then(({ schema, execute, subscribe }) =>
          processRequest({
            operationName,
            query,
            variables,
            request,
            schema,
            parse: parseWithCache,
            execute: ({ document, rootValue, contextValue, variableValues, operationName }) =>
              execute(document, variableValues, contextValue, rootValue, operationName),
            subscribe: ({ document, rootValue, contextValue, variableValues, operationName }) =>
              subscribe(document, variableValues, contextValue, rootValue, operationName),
            contextFactory: () => request,
          })
        )
        .then(processedResult => sendResult(processedResult, response))
        .catch((e: Error | AggregateError) => {
          response.status(500);
          response.write(
            JSON.stringify({
              errors:
                'errors' in e
                  ? e.errors.map((e: Error) => ({
                      name: e.name,
                      message: e.message,
                      stack: e.stack,
                    }))
                  : [
                      {
                        name: e.name,
                        message: e.message,
                        stack: e.stack,
                      },
                    ],
            })
          );
          response.end();
        });
    }
  };
