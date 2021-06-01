import { Request, Response, RequestHandler } from 'express';
import { renderGraphiQL } from 'graphql-helix';
import { Source } from '@graphql-tools/utils';
import { handleFatalError } from '../../handleFatalError';

export const playgroundMiddlewareFactory = ({
  baseDir,
  documents,
  graphqlPath,
}: {
  baseDir: string;
  documents: Source[];
  graphqlPath: string;
}): RequestHandler => {
  let defaultQuery$: Promise<string>;
  return function (req: Request, res: Response, next) {
    defaultQuery$ =
      defaultQuery$ ||
      Promise.resolve()
        .then(async () => {
          let defaultQuery: string;
          if (documents?.length) {
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
          })
      );
    });
  };
};
