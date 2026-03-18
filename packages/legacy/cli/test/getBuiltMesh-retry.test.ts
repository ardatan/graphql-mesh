/* eslint-disable import/no-extraneous-dependencies */
import type { MeshInstance } from '@graphql-mesh/runtime';
import type { MeshPubSub } from '@graphql-mesh/types';

/**
 * Replicates the exact getBuiltMesh pattern emitted by ts-artifacts.ts so we
 * can exercise the retry behaviour in isolation without needing to spin up a
 * real mesh or run a CLI build.
 *
 * The factory accepts injectable getMeshOptions / getMesh so tests can mock
 * failures and successes without module-level mocking.
 */
function createGetBuiltMesh(
  getMeshOptions: () => Promise<unknown>,
  getMesh: (opts: unknown) => Promise<MeshInstance>,
): () => Promise<MeshInstance> {
  let meshInstance$: Promise<MeshInstance> | undefined;

  return function getBuiltMesh(): Promise<MeshInstance> {
    if (meshInstance$ == null) {
      meshInstance$ = getMeshOptions()
        .then(meshOptions => getMesh(meshOptions))
        .then(mesh => {
          const id = mesh.pubsub.subscribe('destroy', () => {
            meshInstance$ = undefined;
            mesh.pubsub.unsubscribe(id);
          });
          return mesh;
        })
        .catch((err: Error) => {
          meshInstance$ = undefined;
          return Promise.reject(err);
        });
    }
    return meshInstance$;
  };
}

function makeMockMesh(): MeshInstance {
  const pubsub: Pick<MeshPubSub, 'subscribe' | 'unsubscribe'> = {
    subscribe: jest.fn().mockReturnValue(1),
    unsubscribe: jest.fn(),
  };
  return { pubsub } as unknown as MeshInstance;
}

describe('getBuiltMesh retry behaviour', () => {
  it('retries on the next call after a transient failure instead of caching the rejection', async () => {
    const mockMesh = makeMockMesh();
    const getMeshOptions = jest.fn().mockResolvedValue({});
    const getMesh = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient: schema fetch failed'))
      .mockResolvedValueOnce(mockMesh);

    const getBuiltMesh = createGetBuiltMesh(getMeshOptions, getMesh);

    // First call — propagates the error to the caller
    await expect(getBuiltMesh()).rejects.toThrow('transient: schema fetch failed');

    // Second call — must retry, not return the permanently cached rejection
    const mesh = await getBuiltMesh();
    expect(mesh).toBe(mockMesh);
    expect(getMesh).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry when the first call succeeds — mesh is reused', async () => {
    const mockMesh = makeMockMesh();
    const getMeshOptions = jest.fn().mockResolvedValue({});
    const getMesh = jest.fn().mockResolvedValue(mockMesh);

    const getBuiltMesh = createGetBuiltMesh(getMeshOptions, getMesh);

    const first = await getBuiltMesh();
    const second = await getBuiltMesh();

    expect(first).toBe(mockMesh);
    expect(second).toBe(mockMesh);
    // getMesh should only have been called once — the promise is cached on success
    expect(getMesh).toHaveBeenCalledTimes(1);
  });

  it('regression: WITHOUT the fix a rejected promise is cached forever', async () => {
    // Demonstrates the original bug so it is clear why the fix is needed.
    // This function mirrors the OLD generated code — no .catch() to clear meshInstance$.
    let meshInstance$: Promise<MeshInstance> | undefined;
    const getMeshOptions = jest.fn().mockResolvedValue({});
    const getMesh = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient failure'))
      .mockResolvedValue(makeMockMesh());

    function buggyGetBuiltMesh(): Promise<MeshInstance> {
      if (meshInstance$ == null) {
        meshInstance$ = getMeshOptions().then(opts => getMesh(opts));
      }
      return meshInstance$;
    }

    // First call fails
    await expect(buggyGetBuiltMesh()).rejects.toThrow('transient failure');

    // Even though getMesh now resolves, the stale rejected promise is returned
    await expect(buggyGetBuiltMesh()).rejects.toThrow('transient failure');

    // getMesh was only called once — the second call never reached it
    expect(getMesh).toHaveBeenCalledTimes(1);
  });
});
