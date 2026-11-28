import { createServer } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import type { ServerAdapter } from '@whatwg-node/server';

export interface DisposableServerOpts {
  port?: number;
}

export interface DisposableServer {
  url: string;
  [DisposableSymbols.asyncDispose](): Promise<void>;
}

/** Hive-compatible disposable HTTP server (`.url` for fetch). */
export async function createDisposableServer(
  handler?: ServerAdapter<any, any> | ((req: any, res: any) => void),
  opts?: DisposableServerOpts,
): Promise<DisposableServer> {
  const server = createServer(handler as any);
  const port = opts?.port || 0;
  await new Promise<void>((resolve, reject) => {
    server.once('error', err => reject(err));
    server.listen(port, () => resolve());
  });
  const sockets = new Set<Socket>();
  server.on('connection', socket => {
    sockets.add(socket);
    socket.once('close', () => {
      sockets.delete(socket);
    });
  });
  return {
    get url(): string {
      const address = server.address() as AddressInfo;
      return `http://localhost:${address.port}`;
    },
    async [DisposableSymbols.asyncDispose]() {
      for (const socket of sockets) {
        socket.destroy();
      }
      await new Promise<void>((resolve, reject) => {
        server.close(err => (err ? reject(err) : resolve()));
      });
    },
  };
}
