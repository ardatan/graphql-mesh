import { createServer } from 'node:http';
import { createRouter, Response, Type } from 'fets';
import { Opts } from '@e2e/opts';

const Headers = Type.Object({
  'x-custom-header': Type.Optional(Type.String()),
});

const opts = Opts(process.argv);
const port = opts.getServicePort('subgraph-b');

createServer(
  createRouter().route({
    method: 'GET',
    path: '/headers',
    schemas: {
      responses: {
        200: Headers,
      },
    },
    handler(req) {
      return Response.json(Object.fromEntries(req.headers) as any);
    },
  }),
).listen(port, () => {
  console.log(`Subgraph B service listening on http://localhost:${port}`);
});
