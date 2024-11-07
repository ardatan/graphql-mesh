import { inspect } from 'util';
import { parse } from 'graphql';
import { createTenv, type Service } from '@e2e/tenv';
import { handleSerializedErrors } from '@e2e/utils/handleSerializedErrors';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { isAsyncIterable } from '@graphql-tools/utils';

describe('gRPC Example', () => {
  const { compose, serve, service } = createTenv(__dirname);
  let movies: Service;
  beforeAll(async () => {
    movies = await service('movies');
  });
  it('generates the correct schema', async () => {
    const { result } = await compose({ services: [movies], maskServicePorts: true });
    expect(result).toMatchSnapshot();
  });
  it('gets movies correctly', async () => {
    const { output } = await compose({ services: [movies], output: 'graphql' });
    const { execute } = await serve({ supergraph: output });
    const query = /* GraphQL */ `
      query GetMovies {
        exampleGetMovies(input: { movie: { genre: DRAMA, year: 2015 } }) {
          result {
            name
            year
            rating
            cast
            time {
              seconds
            }
          }
        }
      }
    `;
    await expect(execute({ query })).resolves.toMatchSnapshot('get-movies-grpc-example-result');
  });
  it('streams movies by cast correctly', async () => {
    const { output } = await compose({ services: [movies], output: 'graphql' });
    const { hostname, port } = await serve({ supergraph: output });
    const executor = buildHTTPExecutor({
      endpoint: `http://${hostname}:${port}/graphql`,
    });
    const document = parse(/* GraphQL */ `
      query SearchMoviesByCast {
        exampleSearchMoviesByCast(input: { castName: "Tom Cruise" }) @stream {
          name
          year
          rating
          cast
        }
      }
    `);
    const result = await executor({ document });
    if (!isAsyncIterable(result)) {
      handleSerializedErrors(result);
      throw new Error('Expected an async iterable but received ' + inspect(result));
    }
    let i = 0;
    for await (const item of result) {
      handleSerializedErrors(item);
      expect(item).toMatchSnapshot(i.toString());
      i++;
    }
  });
  it('fetches movies by cast as a subscription correctly', async () => {
    const { output } = await compose({ services: [movies], output: 'graphql' });
    const { hostname, port } = await serve({ supergraph: output });
    const executor = buildHTTPExecutor({
      endpoint: `http://${hostname}:${port}/graphql`,
    });
    const document = parse(/* GraphQL */ `
      subscription SearchMoviesByCast {
        exampleSearchMoviesByCast(input: { castName: "Tom Cruise" }) {
          name
          year
          rating
          cast
        }
      }
    `);
    const result = await executor({ document });
    if (!isAsyncIterable(result)) {
      handleSerializedErrors(result);
      throw new Error('Expected an async iterable but received ' + inspect(result));
    }
    let i = 0;
    for await (const item of result) {
      handleSerializedErrors(item);
      expect(item).toMatchSnapshot(i.toString());
      i++;
    }
  });
});
