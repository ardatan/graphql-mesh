import { getMesh } from '@graphql-mesh/runtime';
import { flatString, jsonFlatStringify } from '@graphql-mesh/utils';
import { RequestHandler } from 'express';
import { GraphQLError } from 'graphql';
import { getGraphQLParameters, processRequest, shouldRenderGraphiQL } from 'graphql-helix';

function normalizeGraphQLError(error: GraphQLError) {
  return {
    ...error,
    extensions: error.extensions,
    locations: error.locations,
    message: error.message,
    name: error.name,
    nodes: error.nodes,
    originalError: {
      ...error?.originalError,
      name: error?.originalError?.name,
      message: error?.originalError?.message,
      stack: error?.originalError?.stack?.split('\n'),
    },
    path: error.path,
    positions: error.positions,
    source: {
      body: error.source?.body?.split('\n'),
      name: error.source?.name,
      locationOffset: {
        line: error.source?.locationOffset?.line,
        column: error.source?.locationOffset?.column,
      },
    },
    stack: error.stack?.split('\n'),
  };
}

export const graphqlHandler = (mesh$: ReturnType<typeof getMesh>): RequestHandler =>
  function (req, res, next) {
    // Create a generic Request object that can be consumed by Graphql Helix's API
    const request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    };

    // Determine whether we should render GraphiQL instead of returning an API response
    if (shouldRenderGraphiQL(request)) {
      next();
    } else {
      // Extract the GraphQL parameters from the request
      const { operationName, query, variables } = getGraphQLParameters(request);

      Promise.resolve()
        .then(async function () {
          const { schema, execute, subscribe, contextBuilder } = await mesh$;

          // Validate and execute the query
          const result = await processRequest({
            operationName,
            query,
            variables,
            request,
            schema,
            execute: (_schema, _documentAST, rootValue, contextValue, variableValues, operationName) =>
              execute(query, variableValues, contextValue, rootValue, operationName),
            subscribe: (_schema, _documentAST, rootValue, contextValue, variableValues, operationName) =>
              subscribe(query, variableValues, contextValue, rootValue, operationName),
            contextFactory: () => contextBuilder(req),
          });

          // processRequest returns one of three types of results depending on how the server should respond
          // 1) RESPONSE: a regular JSON payload
          // 2) MULTIPART RESPONSE: a multipart response (when @stream or @defer directives are used)
          // 3) PUSH: a stream of events to push back down the client for a subscription
          switch (result.type) {
            case 'RESPONSE':
              // We set the provided status and headers and just the send the payload back to the client
              result.headers.forEach(({ name, value }) => res.setHeader(name, value));
              res.status(result.status);
              if (result.payload.errors?.length) {
                result.payload.errors = result.payload.errors.map(graphQLError =>
                  normalizeGraphQLError(graphQLError)
                ) as any;
              }
              res.json(result.payload);
              break;
            case 'MULTIPART_RESPONSE':
              // Indicate we're sending a multipart response
              res.writeHead(200, {
                Connection: 'keep-alive',
                'Content-Type': 'multipart/mixed; boundary="-"',
                'Transfer-Encoding': 'chunked',
              });

              // If the request is closed by the client, we unsubscribe and stop executing the request
              req.on('close', () => {
                result.unsubscribe();
              });

              res.write('---');

              // Subscribe and send back each result as a separate chunk. We await the subscribe
              // call. Once we're done executing the request and there are no more results to send
              // to the client, the Promise returned by subscribe will resolve and we can end the response.
              await result.subscribe(result => {
                const chunk = Buffer.from(jsonFlatStringify(result), 'utf8');
                const data = [
                  '',
                  'Content-Type: application/json; charset=utf-8',
                  'Content-Length: ' + String(chunk.length),
                  '',
                  chunk,
                ];

                if (result.hasNext) {
                  data.push('---');
                }

                res.write(data.join('\r\n'));
              });

              res.write('\r\n-----\r\n');
              res.end();
              break;
            case 'PUSH':
              // Indicate we're sending an event stream to the client
              res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                Connection: 'keep-alive',
                'Cache-Control': 'no-cache',
              });

              // If the request is closed by the client, we unsubscribe and stop executing the request
              req.on('close', () => {
                result.unsubscribe();
              });

              // We subscribe to the event stream and push any new events to the client
              await result.subscribe(result => {
                const chunk = flatString(`data: ${JSON.stringify(result)}\n\n`);
                res.write(chunk);
              });
              break;
            default:
              throw new Error(`Unknown GraphQL Result: ${JSON.stringify(result)}`);
          }
        })
        .catch(e => {
          res.status(500);
          res.write(
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
          res.end();
        });
    }
  };
