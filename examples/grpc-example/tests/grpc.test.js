require('json-bigint-patch');
const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { printSchema, lexicographicSortSchema } = require('graphql');
const { readFile } = require('fs-extra');

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
const startGrpcServer = require('../start-server');
const grpc$ = startGrpcServer(300);
jest.setTimeout(15000);

describe('gRPC Example', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      printSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('grpc-schema');
  });
  it('should get movies correctly', async () => {
    const GetMoviesQuery = await readFile(join(__dirname, '../example-queries/GetMovies.query.graphql'), 'utf8');
    const { execute } = await mesh$;
    await grpc$;
    const result = await execute(GetMoviesQuery);
    expect(result).toMatchSnapshot('get-movies-grpc-example-result');
  });
  it('should fetch movies by cast as a subscription correctly', async () => {
    const MoviesByCastSubscription = await readFile(join(__dirname, '../example-queries/MoviesByCast.subscription.graphql'), 'utf8');
    const { subscribe } = await mesh$;
    await grpc$;
    const result = await subscribe(MoviesByCastSubscription);
    expect(Symbol.asyncIterator in result).toBeTruthy();
    let i = 0;
    for await (const singleResult of result) {
      expect(singleResult).toMatchSnapshot('movies-by-cast-grpc-example-result-' + i++);
      if (i > 2) {
        break;
      }
    }
  })
  afterAll(() => {
      mesh$.then(mesh => mesh.destroy());
      grpc$.then(grpc => grpc.forceShutdown());
  });
});
