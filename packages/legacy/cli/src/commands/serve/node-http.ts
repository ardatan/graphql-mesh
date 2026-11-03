/* eslint-disable import/no-nodejs-modules */
import { promises as fsPromises } from 'fs';
import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import { getGraphQLWSOptions } from './getGraphQLWSOpts.js';
import type { ServerStartOptions, ServerStartResult } from './types.js';

export async function startNodeHttpServer({
  meshHTTPHandler,
  getBuiltMesh,
  sslCredentials,
  graphqlPath,
  hostname,
  port,
}: ServerStartOptions): Promise<ServerStartResult> {
  let server: HttpServer | HttpsServer;
  if (sslCredentials) {
    const [key, cert] = await Promise.all([
      fsPromises.readFile(sslCredentials.key),
      fsPromises.readFile(sslCredentials.cert),
    ]);
    const nodeHttps = await import('https');
    server = nodeHttps.createServer(
      {
        key,
        cert,
      },
      meshHTTPHandler,
    );
  } else {
    const nodeHttp = await import('http');
    server = nodeHttp.createServer(meshHTTPHandler);
  }
  const ws = await import('ws');
  const wsServer = new ws.WebSocketServer({
    path: graphqlPath,
    server,
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - GraphQL WS has some issues with Bob
  const { useServer } = await import('graphql-ws/use/ws');
  useServer(getGraphQLWSOptions(getBuiltMesh), wsServer);
  const { promise, resolve, reject } = Promise.withResolvers<ServerStartResult>();
  server.once('error', err => reject(err));
  server.listen(port, hostname, () => {
    resolve({
      stop: () => {
        const {
          promise: stopPromise,
          resolve: stopResolve,
          reject: stopReject,
        } = Promise.withResolvers<void>();
        server.closeAllConnections();
        server.close(err => {
          if (err) {
            stopReject(err);
          } else {
            stopResolve();
          }
        });
        return stopPromise;
      },
    });
  });
  return promise;
}
