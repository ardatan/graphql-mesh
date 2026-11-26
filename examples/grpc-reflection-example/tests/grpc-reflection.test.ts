import { join } from 'path';
import { readFile } from 'fs-extra';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Server } from '@grpc/grpc-js';
import startGrpcServer from '../start-server';

async function pickReflectionPort(): Promise<number> {
  const net = await import('net');
  const candidates = [Number(process.env.GRPC_REFLECTION_PORT || 50052), 50053, 50054, 50152];
  for (const port of candidates) {
    const ok = await new Promise<boolean>(resolve => {
      const s = net.createServer();
      s.once('error', () => resolve(false));
      s.listen(port, '0.0.0.0', () => s.close(() => resolve(true)));
    });
    if (ok) return port;
  }
  throw new Error('No free gRPC reflection port');
}

describe('gRPC Reflection Example', () => {
  let mesh: MeshInstance;
  let grpc: Server;
  beforeAll(async () => {
    const port = await pickReflectionPort();
    process.env.GRPC_REFLECTION_PORT = String(port);
    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    // Keep .meshrc.yml at 50052 for docs/CI; override when the sandbox already binds it.
    // findAndParseConfig has already constructed the handler — patch its config bag.
    const handlerConfig = (config.sources[0] as any)?.handler?.config;
    if (handlerConfig) {
      handlerConfig.endpoint = `localhost:${port}`;
    }
    grpc = await startGrpcServer();
    mesh = await getMesh(config);
  });
  it('should generate correct schema', async () => {
    // Port may differ when GRPC_REFLECTION_PORT falls back (sandbox port conflicts).
    const sdl = printSchemaWithDirectives(mesh.schema).replace(
      /localhost:\d+/g,
      'localhost:<port>',
    );
    expect(sdl).toMatchSnapshot('grpc-schema');
  });
  it('should get greeting correctly', async () => {
    const GreetingQuery = await readFile(
      join(__dirname, '../example-queries/GetGreeting.query.graphql'),
      'utf8',
    );
    const result = await mesh.execute(GreetingQuery);
    expect(result).toMatchSnapshot('greeting-result');
  });
  afterAll(() => {
    mesh?.destroy();
    return new Promise<void>((resolve, reject) => {
      grpc?.tryShutdown(err => {
        if (err) {
          reject(err);
        } else {
          setTimeout(resolve, 1000);
        }
      });
    });
  });
});
