import { createServer } from 'node:http';
import { createRouter, Response, Type } from 'fets';
import { Opts } from '@e2e/opts';

export const router = createRouter().route({
  path: '/me',
  method: 'GET',
  schemas: {
    responses: {
      200: Type.Object(
        {
          id: Type.String(),
          name: Type.String(),
          email: Type.String(),
        },
        { title: 'User' },
      ),
      400: Type.Object(
        {
          message: Type.String(),
        },
        { title: 'Error' },
      ),
    },
  },
  handler(req) {
    if (req.headers.get('authorization') === 'Bearer MY_TOKEN') {
      return Response.json({
        id: '1',
        name: 'John Doe',
        email: 'john@doe.com',
      });
    }
    return Response.json(
      {
        message: 'Unauthorized',
      },
      { status: 400 },
    );
  },
});

const opts = Opts(process.argv);

createServer(router).listen(opts.getServicePort('auth'), () => {
  console.log(`Server listening on port ${opts.getServicePort('auth')}`);
});
