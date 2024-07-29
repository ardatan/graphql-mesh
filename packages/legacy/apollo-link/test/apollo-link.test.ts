import { parse } from 'graphql';
import { ApolloClient, InMemoryCache, type FetchResult } from '@apollo/client/core';
import type { MeshInstance } from '@graphql-mesh/runtime';
import { observableToAsyncIterable } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { getTestMesh } from '../../testing/getTestMesh.js';
import { MeshApolloLink } from '../src/index.js';

function getApolloClientFromMesh(mesh: MeshInstance) {
  const client = new ApolloClient({
    link: new MeshApolloLink(mesh),
    cache: new InMemoryCache(),
  });
  return {
    client,
    [DisposableSymbols.dispose]: () => client.stop(),
  };
}

describe('GraphApolloLink', () => {
  it('should handle queries correctly', async () => {
    await using mesh = await getTestMesh();
    await using clientWithDispose = getApolloClientFromMesh(mesh);
    const result = await clientWithDispose.client.query({
      query: parse(/* GraphQL */ `
        query Greetings {
          greetings
        }
      `),
    });
    expect(result.error).toBeUndefined();
    expect(result.errors?.length).toBeFalsy();
    expect(result.data).toEqual({
      greetings: 'This is the `greetings` field of the root `Query` type',
    });
  });
  it('should handle subscriptions correctly', async () => {
    await using mesh = await getTestMesh();
    await using clientWithDispose = getApolloClientFromMesh(mesh);
    const observable = clientWithDispose.client.subscribe({
      query: parse(/* GraphQL */ `
        subscription Time {
          time
        }
      `),
    });
    const asyncIterable =
      observableToAsyncIterable<FetchResult<any, Record<string, any>, Record<string, any>>>(
        observable,
      );
    let i = 0;
    for await (const result of asyncIterable) {
      i++;
      if (i === 2) {
        break;
      }
      expect(result.errors?.length).toBeFalsy();
      const date = new Date(result?.data?.time);
      expect(date.getFullYear()).toBe(new Date().getFullYear());
    }
    expect(i).toBe(2);
  });
});
