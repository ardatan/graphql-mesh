import { join } from 'path';
import { readFile } from 'fs-extra';
import { lexicographicSortSchema, printSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
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
    expect(printSchema(lexicographicSortSchema(mesh.schema))).toMatchSnapshot('grpc-schema');
  });
  it('should get movies correctly', async () => {
    const GetMoviesQuery = await readFile(
      join(__dirname, '../example-queries/GetMovies.query.graphql'),
      'utf8',
    );
    const result = await mesh.execute(GetMoviesQuery, undefined);
    expect(result).toMatchSnapshot('get-movies-grpc-example-result');
  });
  it('should fetch movies by cast as a stream correctly', async () => {
    const MoviesByCastStream = await readFile(
      join(__dirname, '../example-queries/MoviesByCast.stream.graphql'),
      'utf8',
    );
    const result = await mesh.execute(MoviesByCastStream, undefined);
    expect(result).toMatchSnapshot('movies-by-cast-grpc-example-result');
  });
  afterAll(async () => {
    mesh.destroy();
    await new Promise<void>((resolve, reject) => {
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
