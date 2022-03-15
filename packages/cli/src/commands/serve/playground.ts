import { Request, Response, RequestHandler } from 'express';
import { Logger } from '@graphql-mesh/types';
import { renderGraphiQL } from '@graphql-yoga/render-graphiql';

export const playgroundMiddlewareFactory = ({
  baseDir,
  graphqlPath,
  logger,
  title = 'GraphQL Mesh',
}: {
  baseDir: string;
  graphqlPath: string;
  logger: Logger;
  title?: string;
}): RequestHandler => {
  return function (req: Request, res: Response, next) {
    if (req.query.query) {
      next();
      return;
    }

    res.send(
      renderGraphiQL({
        endpoint: graphqlPath,
        title,
      })
    );
  };
};
