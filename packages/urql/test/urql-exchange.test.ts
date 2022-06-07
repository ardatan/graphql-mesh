import { createClient, Client, OperationResult } from '@urql/core';
import { MeshInstance } from '@graphql-mesh/runtime';
import { meshExchange } from '../src';
import { getTestMesh } from '../../testing/getTestMesh';
import { observableToAsyncIterable } from '@graphql-tools/utils';
import { pipe, toObservable } from 'wonka';

describe('graphExchange', () => {
  let client: Client;
  let mesh: MeshInstance;
  beforeEach(async () => {
    mesh = await getTestMesh();
    client = createClient({
      url: 'http://mesh.com',
      exchanges: [meshExchange(mesh)],
    });
  });
  afterEach(() => {
    mesh?.destroy();
  });
  it('should handle queries correctly', async () => {
    const result = await client
      .query(
        /* GraphQL */ `
          query Greetings {
            greetings
          }
        `
      )
      .toPromise();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      greetings: 'This is the `greetings` field of the root `Query` type',
    });
  });
  it('should handle subscriptions correctly', async () => {
    const observable = pipe(
      client.subscription(/* GraphQL */ `
        subscription Time {
          time
        }
      `),
      toObservable
    );

    const asyncIterable = observableToAsyncIterable<OperationResult<any>>(observable);
    let i = 0;
    for await (const result of asyncIterable) {
      i++;
      if (i === 2) {
        break;
      }
      expect(result.error).toBeFalsy();
      const date = new Date(result?.data?.time);
      expect(date.getFullYear()).toBe(new Date().getFullYear());
    }
    expect(i).toBe(2);
  });
});
