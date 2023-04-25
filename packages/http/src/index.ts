import { createRouter, Response, Router } from 'fets';
import { fs, path } from '@graphql-mesh/cross-helpers';
import type { MeshInstance } from '@graphql-mesh/runtime';
import { Logger, YamlConfig } from '@graphql-mesh/types';
import { DefaultLogger, pathExists, withCookies } from '@graphql-mesh/utils';
import { graphqlHandler } from './graphqlHandler.js';

// eslint-disable-next-line @typescript-eslint/ban-types
export type MeshHTTPHandler<TServerContext> = Router<TServerContext, {}, {}>;

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
}): MeshHTTPHandler<TServerContext> {
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

  const router = createRouter<TServerContext>();

  router
    .route({
      path: '*',
      handler() {
        if (!mesh$) {
          mesh$ = getBuiltMesh().then(mesh => {
            readyFlag = true;
            logger = mesh.logger.child('HTTP');
            return mesh;
          });
        }
      },
    })
    .route({
      path: '/healthcheck',
      handler() {
        return new Response(null, {
          status: 200,
        });
      },
    })
    .route({
      path: '/readiness',
      handler() {
        return new Response(null, {
          status: readyFlag ? 204 : 503,
        });
      },
    })
    .route({
      path: '*',
      method: 'POST',
      async handler(request) {
        if (readyFlag) {
          const { pubsub } = await mesh$;
          for (const eventName of pubsub.getEventNames()) {
            const { pathname } = new URL(request.url);
            if (eventName === `webhook:${request.method.toLowerCase()}:${pathname}`) {
              const body = await request.text();
              logger.debug(`Received webhook request for ${pathname}`, body);
              pubsub.publish(
                eventName,
                request.headers.get('content-type') === 'application/json'
                  ? JSON.parse(body)
                  : body,
              );
              return new Response(null, {
                status: 204,
                statusText: 'OK',
              });
            }
          }
        }
        return undefined;
      },
    });

  if (staticFiles) {
    router.route({
      path: '/:relativePath+',
      method: 'GET',
      async handler(request) {
        let { relativePath } = request.params;
        if (!relativePath) {
          relativePath = 'index.html';
        }
        const absoluteStaticFilesPath = path.join(baseDir, staticFiles);
        const absolutePath = path.join(absoluteStaticFilesPath, relativePath);
        if (absolutePath.startsWith(absoluteStaticFilesPath) && (await pathExists(absolutePath))) {
          const readStream = fs.createReadStream(absolutePath);
          return new Response(readStream as any, {
            status: 200,
          });
        }
        return undefined;
      },
    });
  } else if (graphqlPath !== '/') {
    router.route({
      path: '/',
      method: 'GET',
      handler() {
        return new Response(null, {
          status: 302,
          headers: {
            Location: graphqlPath,
          },
        });
      },
    });
  }

  return router.route({
    path: '*',
    handler: [
      withCookies,
      graphqlHandler(() => mesh$, playgroundTitle, playgroundEnabled, graphqlPath, corsConfig),
    ],
  });
}
