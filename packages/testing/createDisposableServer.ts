import { createServer } from 'node:http';
import type { RequestListener, Server } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

export interface DisposableServerOpts {
  port?: number;
}

export interface DisposableServer {
  address(): AddressInfo;
  [DisposableSymbols.asyncDispose](): Promise<void>;
  server: Server;
}

export async function createDisposableServer(
  requestListener?: RequestListener,
  opts?: DisposableServerOpts,
): Promise<DisposableServer> {
  const server = createServer(requestListener);
  const port = opts?.port || 0;
  {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    server.once('error', err => reject(err));
    server.listen(port, () => resolve());
    await promise;
  }
  const sockets = new Set<Socket>();
  server.on('connection', socket => {
    sockets.add(socket);
    socket.once('close', () => {
      sockets.delete(socket);
    });
  });
  return {
    address() {
      return server.address() as AddressInfo;
    },
    [DisposableSymbols.asyncDispose]() {
      for (const socket of sockets) {
        socket.destroy();
      }
      server.closeAllConnections();
      const { promise, resolve, reject } = Promise.withResolvers<void>();
      server.close(err => (err ? reject(err) : resolve()));
      return promise;
    },
    get server(): Server {
      return server;
    },
  };
}
