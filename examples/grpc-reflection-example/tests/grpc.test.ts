import { join } from 'path';
import { readFile } from 'fs-extra';
import { lexicographicSortSchema, printSchema } from 'graphql';
import 'json-bigint-patch';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { Server } from '@grpc/grpc-js';
import startGrpcServer from '../start-server';

describe('gRPC Example', () => {
  let mesh: MeshInstance;
  let grpc: Server;
  beforeAll(async () => {
    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    grpc = await startGrpcServer();
    mesh = await getMesh(config);
  });
  it('should generate correct schema', async () => {
    expect(printSchema(lexicographicSortSchema(mesh.schema))).toMatchSnapshot('grpc-schema');
  });
  it('should get greeting correctly', async () => {
    const GreetingQuery = await readFile(
      join(__dirname, '../example-queries/GetGreeting.query.graphql'),
      'utf8',
    );
    const result = await mesh.execute(GreetingQuery, undefined);
    expect(result).toMatchSnapshot('greeting-result');
  });
  afterAll(() => {
    mesh.destroy();
    return new Promise<void>((resolve, reject) => {
      grpc.tryShutdown(err => {
        if (err) {
          reject(err);
        } else {
          setTimeout(resolve, 1000);
        }
      });
    });
  });
});
