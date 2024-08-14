import { createServer } from 'node:http';
import { createRouter, Response, Type } from 'fets';
import { Opts } from '@e2e/opts';

const opts = Opts(process.argv);

createServer(
  createRouter().route({
    method: 'GET',
    operationId: 'greet',
    path: '/greet/:name',
    schemas: {
      request: {
        params: Type.Object({
          name: Type.String(),
        }),
      },
      responses: {
        200: Type.Object({
          greeting: Type.String(),
        }),
      },
    },
    handler(req) {
      return Response.json({
        greeting: `Hello, ${req.params.name}!`,
      });
    },
  }),
).listen(opts.getServicePort('greetings'));
