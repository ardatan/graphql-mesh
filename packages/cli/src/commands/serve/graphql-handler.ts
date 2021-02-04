import { RequestHandler } from 'express';
import { GraphQLSchema } from 'graphql';
import { getGraphQLParameters, processRequest, shouldRenderGraphiQL } from 'graphql-helix';

export const graphqlHandler = (
  schema: GraphQLSchema,
  contextBuilder: (initialContextValue?: any) => Promise<Record<string, any>>
): RequestHandler =>
  function (req, res, next) {
    Promise.resolve().then(async function () {
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
        return;
      }

      // Extract the GraphQL parameters from the request
      const { operationName, query, variables } = getGraphQLParameters(request);

      // Validate and execute the query
      const result = await processRequest({
        operationName,
        query,
        variables,
        request,
        schema,
        contextFactory: () => contextBuilder(req),
      });

      // processRequest returns one of three types of results depending on how the server should respond
      // 1) RESPONSE: a regular JSON payload
      // 2) MULTIPART RESPONSE: a multipart response (when @stream or @defer directives are used)
      // 3) PUSH: a stream of events to push back down the client for a subscription
      if (result.type === 'RESPONSE') {
        // We set the provided status and headers and just the send the payload back to the client
        result.headers.forEach(({ name, value }) => res.setHeader(name, value));
        res.status(result.status);
        if (result.payload.errors?.length) {
          result.payload.errors = result.payload.errors.map(error => ({
            extensions: error.extensions,
            locations: error.locations,
            message: error.message,
            name: error.name,
            nodes: error.nodes,
            originalError: {
              ...error?.originalError,
              name: error?.originalError?.name,
              message: error?.originalError?.message,
              stack: error?.originalError?.stack.split('\n'),
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
            ...error,
          })) as any;
        }
        res.json(result.payload);
      } else if (result.type === 'MULTIPART_RESPONSE') {
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
          const chunk = Buffer.from(JSON.stringify(result), 'utf8');
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
      } else {
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
          res.write(`data: ${JSON.stringify(result)}\n\n`);
        });
      }
    });
  };
