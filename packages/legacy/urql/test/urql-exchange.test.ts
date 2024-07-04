import { pipe, toObservable } from 'wonka';
import type { MeshInstance } from '@graphql-mesh/runtime';
import { observableToAsyncIterable } from '@graphql-tools/utils';
import { createClient, type OperationResult } from '@urql/core';
import { getTestMesh } from '../../testing/getTestMesh.js';
import { meshExchange } from '../src/index.js';

function getUrqlClientFromMesh(mesh: MeshInstance) {
  return createClient({
    url: 'http://mesh.com',
    exchanges: [meshExchange(mesh)],
  });
}

describe('Mesh Exchange', () => {
  it('should handle queries correctly', async () => {
    await using mesh = await getTestMesh();
    const client = getUrqlClientFromMesh(mesh);
    const result = await client
      .query(
        /* GraphQL */ `
          query Greetings {
            greetings
          }
        `,
        {},
      )
      .toPromise();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      greetings: 'This is the `greetings` field of the root `Query` type',
    });
  });
  it('should handle subscriptions correctly', async () => {
    await using mesh = await getTestMesh();
    const client = getUrqlClientFromMesh(mesh);
    const observable = pipe(
      client.subscription(
        /* GraphQL */ `
          subscription Time {
            time
          }
        `,
        {},
      ),
      toObservable,
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
