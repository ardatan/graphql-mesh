import { makeBehavior } from 'graphql-ws/lib/use/uWebSockets';
import { type TemplatedApp } from 'uWebSockets.js';
import { getGraphQLWSOptions } from './getGraphQLWSOpts.js';
import type { ServerStartOptions, ServerStartResult } from './types.js';

export async function startuWebSocketsServer({
  meshHTTPHandler,
  getBuiltMesh,
  sslCredentials,
  graphqlPath,
  hostname,
  port,
}: ServerStartOptions): Promise<ServerStartResult> {
  let uWebSocketsApp: TemplatedApp;

  if (sslCredentials) {
    const { SSLApp } = await import('uWebSockets.js');
    uWebSocketsApp = SSLApp({
      key_file_name: sslCredentials.key,
      cert_file_name: sslCredentials.cert,
    });
  } else {
    const { App } = await import('uWebSockets.js');
    uWebSocketsApp = App();
  }

  uWebSocketsApp.any('/*', meshHTTPHandler);

  const wsHandler = makeBehavior(getGraphQLWSOptions(getBuiltMesh));

  uWebSocketsApp.ws(graphqlPath, wsHandler);

  return new Promise(function (resolve, reject) {
    uWebSocketsApp.listen(hostname, port, listenSocket => {
      if (!listenSocket) {
        reject(new Error(`Failed to listen ${port} on ${hostname}`));
      }
      resolve({
        stop() {
          uWebSocketsApp?.close?.();
        },
      });
    });
  });
}
