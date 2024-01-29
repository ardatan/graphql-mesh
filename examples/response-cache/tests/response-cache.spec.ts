import { join } from 'path';
import { ExecutionResult } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';

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

describe('Response Cache', () => {
  describe.each(Object.entries(meshInstances))('%s', (_, getMeshInstance) => {
    let mesh: MeshInstance;
    let meshHttp: MeshHTTPHandler;

    beforeAll(async () => {
      mesh = await getMeshInstance();
      meshHttp = createMeshHTTPHandler({
        baseDir,
        getBuiltMesh: async () => mesh,
      });
    });

    afterAll(() => mesh.destroy());

    it('should cache simple operation', async () => {
      const gqlQuery = /* GraphQL */ `
        query Test {
          greeting {
            hello
          }
        }
      `;
      expect(await query(gqlQuery)).toEqual({
        data: { greeting: { hello: 'world' } },
        extensions: {
          responseCache: {
            didCache: true,
            hit: false,
            ttl: 100,
          },
        },
      });
      expect(await query(gqlQuery)).toEqual({
        data: { greeting: { hello: 'world' } },
        extensions: {
          responseCache: {
            hit: true,
          },
        },
      });
    });

    it('should cache with per field TTL', async () => {
      const gqlQuery = /* GraphQL */ `
        query Test {
          withTTL {
            hello
          }
        }
      `;
      expect(await query(gqlQuery)).toEqual({
        data: { withTTL: { hello: 'world' } },
        extensions: {
          responseCache: {
            didCache: true,
            hit: false,
            ttl: 3600000,
          },
        },
      });
      expect(await query(gqlQuery)).toEqual({
        data: { withTTL: { hello: 'world' } },
        extensions: {
          responseCache: {
            hit: true,
          },
        },
      });
    });

    async function query(graphqlQuery: string): Promise<ExecutionResult> {
      const response = await meshHttp.fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: graphqlQuery }),
      });
      expect(response.status).toBe(200);
      return (await response.json()) as ExecutionResult;
    }
  });
});
