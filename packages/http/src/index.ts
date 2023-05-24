import { fs, path } from '@graphql-mesh/cross-helpers';
import type { MeshInstance } from '@graphql-mesh/runtime';
import { Logger, YamlConfig } from '@graphql-mesh/types';
import { DefaultLogger, pathExists, withCookies } from '@graphql-mesh/utils';
import { createServerAdapter, Response } from '@whatwg-node/server';
import { graphqlHandler } from './graphqlHandler.js';

// eslint-disable-next-line @typescript-eslint/ban-types
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
  let mesh$: Promise<MeshInstance>;

  const {
    cors: corsConfig,
    staticFiles,
    playground: playgroundEnabled,
    endpoint: graphqlPath = '/graphql',
    // TODO
    // trustProxy = 'loopback',
  } = rawServeConfig;

  return createServerAdapter<TServerContext>(
    graphqlHandler(() => mesh$, playgroundTitle, playgroundEnabled, graphqlPath, corsConfig),
    {
      plugins: [
        {
          async onRequest({ request, url, endResponse }): Promise<void> {
            if (!mesh$) {
              mesh$ = getBuiltMesh().then(mesh => {
                readyFlag = true;
                logger = mesh.logger.child('HTTP');
                return mesh;
              });
            }
            switch (url.pathname) {
              case '/healthcheck':
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
            if (readyFlag) {
              const { pubsub } = await mesh$;
              for (const eventName of pubsub.getEventNames()) {
                if (eventName === `webhook:${request.method.toLowerCase()}:${url.pathname}`) {
                  const body = await request.text();
                  logger.debug(`Received webhook request for ${url.pathname}`, body);
                  pubsub.publish(
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
            }
            if (staticFiles && request.method === 'GET') {
              let relativePath = url.pathname;
              if (relativePath === '/' || !relativePath) {
                relativePath = 'index.html';
              }
              const absoluteStaticFilesPath = path.join(baseDir, staticFiles);
              const absolutePath = path.join(absoluteStaticFilesPath, relativePath);
              if (
                absolutePath.startsWith(absoluteStaticFilesPath) &&
                (await pathExists(absolutePath))
              ) {
                const readStream = fs.createReadStream(absolutePath);
                endResponse(
                  new Response(readStream as any, {
                    status: 200,
                  }),
                );
                return;
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
          },
        },
      ],
    },
  );
}
