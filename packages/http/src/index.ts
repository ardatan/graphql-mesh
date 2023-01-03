import { fs, path } from '@graphql-mesh/cross-helpers';
import { MeshInstance } from '@graphql-mesh/runtime';
import { Logger, YamlConfig } from '@graphql-mesh/types';
import { DefaultLogger, pathExists } from '@graphql-mesh/utils';
import { createRouter, Response, Router } from '@whatwg-node/router';
import { withCookies } from 'itty-router-extras';
import { graphqlHandler } from './graphqlHandler.js';

export type MeshHTTPHandler<TServerContext> = Router<TServerContext>;

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

  router.all('*', () => {
    if (!mesh$) {
      mesh$ = getBuiltMesh().then(mesh => {
        readyFlag = true;
        logger = mesh.logger.child('HTTP');
        return mesh;
      });
    }
  });

  router.all(
    '/healthcheck',
    () =>
      new Response(null, {
        status: 200,
      }),
  );
  router.all(
    '/readiness',
    () =>
      new Response(null, {
        status: readyFlag ? 204 : 503,
      }),
  );

  router.post('*', async (request: Request) => {
    if (readyFlag) {
      const { pubsub } = await mesh$;
      for (const eventName of pubsub.getEventNames()) {
        const { pathname } = new URL(request.url);
        if (eventName === `webhook:${request.method.toLowerCase()}:${pathname}`) {
          const body = await request.text();
          logger.debug(`Received webhook request for ${pathname}`, body);
          pubsub.publish(
            eventName,
            request.headers.get('content-type') === 'application/json' ? JSON.parse(body) : body,
          );
          return new Response(null, {
            status: 204,
            statusText: 'OK',
          });
        }
      }
    }
    return undefined;
  });

  if (staticFiles) {
    router.get('/:relativePath+', async request => {
      let { relativePath } = request.params;
      if (!relativePath) {
        relativePath = 'index.html';
      }
      const absolutePath = path.join(baseDir, staticFiles, relativePath);
      if (await pathExists(absolutePath)) {
        const readStream = fs.createReadStream(absolutePath);
        return new Response(readStream as any, {
          status: 200,
        });
      }
      return undefined;
    });
  } else if (graphqlPath !== '/') {
    router.get(
      '/',
      () =>
        new Response(null, {
          status: 302,
          headers: {
            Location: graphqlPath,
          },
        }),
    );
  }

  router.all('*', withCookies as any);

  router.all(
    '*',
    graphqlHandler(() => mesh$, playgroundTitle, playgroundEnabled, graphqlPath, corsConfig),
  );

  return router;
}
