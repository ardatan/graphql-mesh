import { Request, Response, RequestHandler } from 'express';
import { renderGraphiQL } from 'graphql-helix';

export const playgroundMiddlewareFactory = ({
  defaultQuery,
  graphqlPath,
}: {
  defaultQuery: string;
  graphqlPath: string;
}): RequestHandler =>
  function (req: Request, res: Response, next) {
    if (req.query.query) {
      next();
      return;
    }

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
  };
