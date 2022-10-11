import 'json-bigint-patch';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh } from '@graphql-mesh/runtime';
import { join } from 'path';

import { printSchema, lexicographicSortSchema } from 'graphql';
import { readFile } from 'fs-extra';

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
import { startServer as startGrpcServer } from '../start-server';
import { Server } from '@grpc/grpc-js';
const grpc$ = startGrpcServer(300);
jest.setTimeout(15000);

describe('gRPC Example', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      printSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      }),
    ).toMatchSnapshot('grpc-schema');
  });
  it('should get movies correctly', async () => {
    const GetMoviesQuery = await readFile(
      join(__dirname, '../example-queries/GetMovies.query.graphql'),
      'utf8',
    );
    const { execute } = await mesh$;
    await grpc$;
    const result = await execute(GetMoviesQuery, {});
    expect(result).toMatchSnapshot('get-movies-grpc-example-result');
  });
  it('should fetch movies by cast as a stream correctly', async () => {
    const MoviesByCastStream = await readFile(
      join(__dirname, '../example-queries/MoviesByCast.stream.graphql'),
      'utf8',
    );
    const { execute } = await mesh$;
    await grpc$;
    const result = await execute(MoviesByCastStream);
    expect(result).toMatchSnapshot('movies-by-cast-grpc-example-result');
  });
  afterAll(() => {
    mesh$.then(mesh => mesh.destroy());
    grpc$.then((grpc: Server) => grpc.forceShutdown());
  });
});
