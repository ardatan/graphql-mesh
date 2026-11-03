import { createServer } from 'http';
import type { AddressInfo } from 'net';

export async function getAvailablePort() {
  const server = createServer();
  {
    const { promise, resolve } = Promise.withResolvers<void>();
    server.listen(0, resolve);
    await promise;
  }
  const port = (server.address() as AddressInfo).port;
  {
    const { promise, resolve } = Promise.withResolvers<void>();
    server.close(() => resolve());
    await promise;
  }
  return port;
}
