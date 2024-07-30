import { createServer } from 'http';
import type { AddressInfo } from 'net';

export async function getAvailablePort() {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
