import { join } from 'path';
import { ExecutionResult } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { fakePromise } from '@graphql-tools/utils';

const baseDir = join(__dirname, '..');

const meshInstances = {
  'Mesh runtime': async () => {
    const config = await findAndParseConfig({ dir: baseDir });
    return getMesh(config);
  },
  'Mesh artifact': async () => {
    const { getBuiltMesh } = await import('../.mesh/index');
    return getBuiltMesh();
  },
};

describe('Persisted Queries', () => {
  describe.each(Object.entries(meshInstances))('%s', (_, getMeshInstance) => {
    let mesh: MeshInstance;
    let meshHttp: MeshHTTPHandler;

    beforeAll(async () => {
      mesh = await getMeshInstance();
      meshHttp = createMeshHTTPHandler({
        baseDir,
        getBuiltMesh: () => fakePromise(mesh),
      });
    });

    afterAll(() => mesh?.destroy());

    it('should give correct response for inline persisted operation', async () => {
      const response = await meshHttp.fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: 'ece829f774dcb3e1358987feb1f86832b39472406a3ef65dce6a2a740304148a',
            },
          },
        }),
      });

      expect(response.status).toBe(200);
      const result = (await response.json()) as ExecutionResult;
      expect(result?.errors).toBeFalsy();
      expect(result.data).toEqual({ __typename: 'Query' });
    });

    it('should give correct response for file documents', async () => {
      const response = await meshHttp.fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: '2e0534aab6b2b83bc791439094830b45b621deec2087b8567539f37defd391ac',
            },
          },
        }),
      });

      expect(response.status).toBe(200);
      const result = (await response.json()) as ExecutionResult;
      expect(result?.errors).toBeFalsy();
      expect(result.data).toEqual({ greeting: { hello: 'world' } });
    });

    it('should not restrict to persisted queries only', async () => {
      const response = await meshHttp.fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query HelloWorld {
              greeting {
                __typename
              }
            }
          `,
        }),
      });

      expect(response.status).toBe(200);
      const result = (await response.json()) as ExecutionResult;
      expect(result?.errors).toBeFalsy();
      expect(result.data).toEqual({ greeting: { __typename: 'query_greeting' } });
    });
  });
});
