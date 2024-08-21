import { createServer } from 'http';
import { createRouter, Response, Type } from 'fets';

createServer(
  createRouter().route({
    operationId: 'greetingsFromREST',
    path: '/greetings/:name',
    method: 'GET',
    schemas: {
      request: {
        params: Type.Object({
          name: Type.String(),
        }),
      },
      responses: {
        200: Type.Object({
          message: Type.String(),
        }),
      },
    },
    handler: ({ params }) =>
      Response.json({
        message: `Hello, ${params.name}!`,
      }),
  }),
).listen(4002, () => {
  console.log('Server is running on http://localhost:4002');
});
