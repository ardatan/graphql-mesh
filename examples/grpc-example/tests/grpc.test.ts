import { join } from 'path';
import { readFile } from 'fs-extra';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Server } from '@grpc/grpc-js';
import { startServer as startGrpcServer } from '../start-server';

describe('gRPC Example', () => {
  let mesh: MeshInstance;
  let grpc: Server;
  beforeAll(async () => {
    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
    grpc = await startGrpcServer(300);
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(mesh.schema)).toMatchSnapshot('grpc-schema');
  });
  it('should get movies correctly', async () => {
    const GetMoviesQuery = await readFile(
      join(__dirname, '../example-queries/GetMovies.query.graphql'),
      'utf8',
    );
    const result = await mesh.execute(GetMoviesQuery);
    expect(result).toMatchSnapshot('get-movies-grpc-example-result');
  });
  it('should fetch movies by cast as a stream correctly', async () => {
    const MoviesByCastStream = await readFile(
      join(__dirname, '../example-queries/MoviesByCast.stream.graphql'),
      'utf8',
    );
    const result = await mesh.execute(MoviesByCastStream);
    let i = 0;
    for await (const item of result as AsyncIterable<any>) {
      expect(item).toMatchSnapshot(`movies-by-cast-grpc-example-result-stream-${i++}`);
    }
  });
  it('should fetch movies by cast as a subscription correctly', async () => {
    const MoviesByCastSubscription = await readFile(
      join(__dirname, '../example-queries/MoviesByCast.subscription.graphql'),
      'utf8',
    );
    const result = await mesh.execute(MoviesByCastSubscription);
    let i = 0;
    for await (const item of result as AsyncIterable<any>) {
      expect(item).toMatchSnapshot(`movies-by-cast-grpc-example-result-subscription-${i++}`);
    }
  });
  afterAll(async () => {
    mesh?.destroy();
    await new Promise<void>((resolve, reject) => {
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
