import type { ServerOptions } from './types.js';

export async function startuWebSocketsServer({
  handler,
  log,
  protocol,
  host,
  port,
  sslCredentials,
}: ServerOptions): Promise<Disposable> {
  return import('uWebSockets.js').then(uWS => {
    const app = sslCredentials ? uWS.SSLApp(sslCredentials) : uWS.App();
    app.any('/*', handler);
    log.info(`Starting server on ${protocol}://${host}:${port}`);
    return new Promise((resolve, reject) => {
      app.listen(host, port, function listenCallback(listenSocket) {
        if (listenSocket) {
          resolve({
            [Symbol.dispose]() {
              log.info(`Closing ${protocol}://${host}:${port}`);
              app.close();
            },
          });
        } else {
          reject(new Error(`Failed to start server on ${protocol}://${host}:${port}!`));
        }
      });
    });
  });
}
