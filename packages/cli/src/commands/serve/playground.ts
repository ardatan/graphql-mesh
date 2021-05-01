import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadDocuments } from '@graphql-tools/load';
import { Request, Response, RequestHandler } from 'express';
import { renderGraphiQL } from 'graphql-helix';
import { handleFatalError } from '../../handleFatalError';

export const playgroundMiddlewareFactory = ({
  baseDir,
  exampleQuery,
  hostname,
  port,
  graphqlPath,
}: {
  baseDir: string;
  exampleQuery: string;
  hostname: string;
  port: string | number;
  graphqlPath: string;
}): RequestHandler => {
  let defaultQuery$: Promise<string>;
  return function (req: Request, res: Response, next) {
    defaultQuery$ =
      defaultQuery$ ||
      Promise.resolve()
        .then(async () => {
          let defaultQuery: string;
          if (exampleQuery) {
            const documents = await loadDocuments(exampleQuery, {
              loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
              cwd: baseDir,
            });

            defaultQuery = documents.reduce((acc, doc) => (acc += doc.rawSDL! + '\n'), '');
          }
          return defaultQuery;
        })
        .catch(handleFatalError);
    if (req.query.query) {
      next();
      return;
    }

    defaultQuery$.then(defaultQuery => {
      res.send(
        `
  <script>
    let fakeStorageObj = {};
    const fakeStorageInstance = {
      getItem(key) {
        return fakeStorageObj[key];
      },
      setItem(key, val) {
        fakeStorageObj[key] = val;
      },
      clear() {
        fakeStorageObj = {};
      },
      key(i) {
        return Object.keys(fakeStorageObj)[i];
      },
      removeItem(key) {
        delete fakeStorageObj[key];
      },
      get length() {
        return Object.keys(fakeStorageObj).length;
      }
    };
    Object.defineProperty(window, 'localStorage', {
      value: fakeStorageInstance,
    });
  </script>` +
          renderGraphiQL({
            defaultQuery,
            endpoint: graphqlPath,
            subscriptionsEndpoint: `ws://${hostname}:${port}${graphqlPath}`,
          })
      );
    });
  };
};
