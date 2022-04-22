import { MeshInstance } from '@graphql-mesh/runtime';
import { RequestHandler } from 'express';
import { createServer, useExtendContext, useLogger } from '@graphql-yoga/node';

export const graphqlHandler = (
  mesh$: Promise<MeshInstance>,
  playgroundTitle: string,
  playgroundEnabled: boolean
): RequestHandler => {
  const yoga$ = mesh$.then(mesh =>
    createServer({
      parserCache: false,
      validationCache: false,
      plugins: [
        ...mesh.plugins,
        useExtendContext(({ req, res }) => ({
          ...req,
          headers: req.headers,
          cookies: req.cookies,
          res,
        })),
        useLogger({
          skipIntrospection: true,
          logFn: (eventName, { args }) => {
            if (eventName.endsWith('-start')) {
              mesh.logger.debug(() => [`\t headers: `, args.contextValue.headers]);
            }
          },
        }),
      ],
      logging: mesh.logger,
      maskedErrors: false,
      graphiql: playgroundEnabled && {
        title: playgroundTitle,
      },
    })
  );
  return function (req, res) {
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
  };
};
