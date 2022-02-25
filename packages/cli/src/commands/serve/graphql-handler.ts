import { getMesh } from '@graphql-mesh/runtime';
import { RequestHandler } from 'express';
import { shouldRenderGraphiQL } from 'graphql-helix';
import { createServer, useExtendContext } from '@graphql-yoga/node';
import { IncomingMessage } from 'http';

export const graphqlHandler = (mesh$: ReturnType<typeof getMesh>): RequestHandler => {
  const yoga$ = mesh$.then(mesh =>
    createServer({
      plugins: [...mesh.plugins, useExtendContext(({ req }: { req: IncomingMessage }) => req)],
      logging: mesh.logger,
      maskedErrors: false,
    })
  );
  return function (req, res, next) {
    // Determine whether we should render GraphiQL instead of returning an API response
    if (shouldRenderGraphiQL(req)) {
      next();
    } else {
      yoga$
        .then(yoga => yoga.requestListener(req, res))
        .catch((e: Error | AggregateError) => {
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
};
