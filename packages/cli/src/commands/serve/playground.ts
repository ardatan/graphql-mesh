import { Request, Response, RequestHandler } from 'express';
import { loadDocuments } from '@graphql-tools/load';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { basename, resolve } from 'path';
import { readFile } from 'fs-extra';

export function playground(exampleQuery: string, graphqlPath: string): RequestHandler {
  return async (req: Request, res: Response, next) => {
    if (req.query.query) {
      next();
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.write(`
          <script>
              const localStorageMock = new Map();
              Object.defineProperty(window, 'localStorage', {
                get() {
                  return {
                    getItem(key) {
                      return localStorageMock.get(key);
                    },
                    setItem(key, val) {
                      return localStorageMock.set(key, val);
                    },
                    clear() {
                      return localStorageMock.clear();
                    },
                    key(i) {
                      return localStorageMock.keys()[i];
                    },
                    remove(key) {
                      return localStorageMock.delete(key);
                    },
                    get length() {
                      return localStorageMock.size;
                    }
                  }
                }
              });
            </script>
        `);

    const renderPageOptions: any = {
      title: 'GraphQL Mesh Playground',
    };

    if (exampleQuery) {
      const documents = await loadDocuments(exampleQuery, {
        loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
        cwd: process.cwd(),
      });

      renderPageOptions.tabs = documents.map(doc => ({
        name: doc.location && basename(doc.location),
        query: doc.rawSDL!,
      }));
    }

    res.write(await readFile(resolve(__dirname, './playground.html'), 'utf8'));
    res.write(`
            <script>
            window.addEventListener('load', function (event) {
                const renderPageOptions = ${JSON.stringify(renderPageOptions)};
                const endpoint = location.protocol + '//' + location.hostname + (location.port ? (':' + location.port) : '') + '${graphqlPath}';
                renderPageOptions.endpoint = endpoint;
                if (renderPageOptions.tabs) {
                    renderPageOptions.tabs.forEach(tab => {
                        tab.endpoint = endpoint;
                    });
                }
                renderPageOptions.settings = {
                  'request.credentials': 'same-origin',
                  'schema.polling.enable': false,
                };
                GraphQLPlayground.init(document.getElementById('root'), renderPageOptions);
            });
            </script>
        `);
    res.end();
  };
}
