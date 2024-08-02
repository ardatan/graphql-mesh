import { fs, path, process } from '@graphql-mesh/cross-helpers';
import type { MeshInstance } from '@graphql-mesh/runtime';
import type { Logger, YamlConfig } from '@graphql-mesh/types';
import { DefaultLogger, pathExists, withCookies } from '@graphql-mesh/utils';
import { createServerAdapter, Response } from '@whatwg-node/server';
import { graphqlHandler } from './graphqlHandler.js';

export type MeshHTTPHandler = ReturnType<typeof createMeshHTTPHandler>;

export function createMeshHTTPHandler<TServerContext>({
  baseDir,
  getBuiltMesh,
  rawServeConfig = {},
  playgroundTitle,
}: {
  baseDir: string;
  getBuiltMesh: () => Promise<MeshInstance>;
  rawServeConfig?: YamlConfig.Config['serve'];
  playgroundTitle?: string;
}) {
  let readyFlag = false;
  let logger: Logger = new DefaultLogger('Mesh HTTP');

  const {
    cors: corsConfig,
    staticFiles,
    playground: playgroundEnabled = process.env.NODE_ENV !== 'production',
    endpoint: graphqlPath = '/graphql',
    batchingLimit,
    healthCheckEndpoint = '/healthcheck',
    extraParamNames,
  } = rawServeConfig;

  getBuiltMesh()
    .then(mesh => {
      readyFlag = true;
      logger = mesh.logger.child('HTTP');
    })
    .catch(err => {
      logger.error(err);
    });

  return createServerAdapter<TServerContext>(
    graphqlHandler({
      getBuiltMesh,
      playgroundTitle,
      playgroundEnabled,
      graphqlEndpoint: graphqlPath,
      corsConfig,
      batchingLimit,
      extraParamNames,
    }),
    {
      plugins: [
        {
          onRequest({ request, url, endResponse }): void | Promise<void> {
            switch (url.pathname) {
              case healthCheckEndpoint:
                endResponse(
                  new Response(null, {
                    status: 200,
                  }),
                );
                return;
              case '/readiness':
                endResponse(
                  new Response(null, {
                    status: readyFlag ? 204 : 503,
                  }),
                );
                return;
            }
            if (staticFiles && request.method === 'GET') {
              let relativePath = url.pathname;
              if (relativePath === '/' || !relativePath) {
                relativePath = 'index.html';
              }
              const absoluteStaticFilesPath = path.join(baseDir, staticFiles);
              const absolutePath = path.join(absoluteStaticFilesPath, relativePath);
              if (absolutePath.startsWith(absoluteStaticFilesPath)) {
                return pathExists(absolutePath).then(exists => {
                  if (exists) {
                    const readStream = fs.createReadStream(absolutePath);
                    endResponse(
                      new Response(readStream as any, {
                        status: 200,
                      }),
                    );
                  }
                });
              }
            } else if (graphqlPath !== '/' && url.pathname === '/') {
              endResponse(
                new Response(null, {
                  status: 302,
                  headers: {
                    Location: graphqlPath,
                  },
                }),
              );
              // eslint-disable-next-line no-useless-return
              return;
            }
            withCookies(request);
            if (readyFlag) {
              return getBuiltMesh().then(async mesh => {
                for (const eventName of mesh.pubsub.getEventNames()) {
                  if (eventName === `webhook:${request.method.toLowerCase()}:${url.pathname}`) {
                    const body = await request.text();
                    logger.debug(`Received webhook request for ${url.pathname}`, body);
                    mesh.pubsub.publish(
                      eventName,
                      request.headers.get('content-type') === 'application/json'
                        ? JSON.parse(body)
                        : body,
                    );
                    endResponse(
                      new Response(null, {
                        status: 204,
                        statusText: 'OK',
                      }),
                    );
                    return;
                  }
                }
              });
            }
          },
        },
      ],
    },
  );
}
