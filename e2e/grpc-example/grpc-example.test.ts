import { inspect } from 'util';
import { parse } from 'graphql';
import { createTenv, type Service } from '@e2e/tenv';
import { handleSerializedErrors } from '@e2e/utils/handleSerializedErrors';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { isAsyncIterable } from '@graphql-tools/utils';

describe('gRPC Example', () => {
  it.concurrent('generates the correct schema', async () => {
    await using tenv = createTenv(__dirname);
    await using movies = await tenv.service('movies');
    await using composition = await tenv.compose({ services: [movies], maskServicePorts: true });
    expect(composition.supergraphSdl).toMatchSnapshot();
  });
  it.concurrent('gets movies correctly', async () => {
    await using tenv = createTenv(__dirname);
    await using movies = await tenv.service('movies');
    await using composition = await tenv.compose({ services: [movies], output: 'graphql' });
    await using gw = await tenv.gateway({ supergraph: composition.supergraphPath });
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
    await expect(gw.execute({ query })).resolves.toMatchSnapshot('get-movies-grpc-example-result');
  });
  it.concurrent('streams movies by cast correctly', async () => {
    await using tenv = createTenv(__dirname);
    await using movies = await tenv.service('movies');
    await using composition = await tenv.compose({ services: [movies], output: 'graphql' });
    await using gw = await tenv.gateway({ supergraph: composition.supergraphPath });
    await using executor = buildHTTPExecutor({
      endpoint: `http://${gw.hostname}:${gw.port}/graphql`,
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
  it.concurrent('fetches movies by cast as a subscription correctly', async () => {
    await using tenv = createTenv(__dirname);
    await using movies = await tenv.service('movies');
    await using composition = await tenv.compose({ services: [movies], output: 'graphql' });
    await using gw = await tenv.gateway({ supergraph: composition.supergraphPath });
    await using executor = buildHTTPExecutor({
      endpoint: `http://${gw.hostname}:${gw.port}/graphql`,
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
