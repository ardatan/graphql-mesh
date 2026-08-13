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
      // Stable session header so entries are shared within this test
      const headers = { test: 'simple' };
      expect(await query(gqlQuery, headers)).toEqual({
        data: { greeting: { hello: 'world' } },
        extensions: {
          responseCache: {
            didCache: true,
            hit: false,
            ttl: 100,
          },
        },
      });
      expect(await query(gqlQuery, headers)).toEqual({
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
      const headers = { test: 'ttl' };
      expect(await query(gqlQuery, headers)).toEqual({
        data: { withTTL: { hello: 'world' } },
        extensions: {
          responseCache: {
            didCache: true,
            hit: false,
            ttl: 3600000,
          },
        },
      });
      expect(await query(gqlQuery, headers)).toEqual({
        data: { withTTL: { hello: 'world' } },
        extensions: {
          responseCache: {
            hit: true,
          },
        },
      });
    });

    it('should not share cache across different session header values (#5102)', async () => {
      const gqlQuery = /* GraphQL */ `
        query HelloWorld {
          greeting {
            hello
          }
        }
      `;

      expect(await query(gqlQuery, { test: 'a' })).toMatchObject({
        data: { greeting: { hello: 'world' } },
        extensions: {
          responseCache: {
            didCache: true,
            hit: false,
          },
        },
      });

      expect(await query(gqlQuery, { test: 'a' })).toMatchObject({
        data: { greeting: { hello: 'world' } },
        extensions: {
          responseCache: {
            hit: true,
          },
        },
      });

      // Changing `test` must miss — reproduces codesandbox clever-williams-j8m76t
      expect(await query(gqlQuery, { test: 'b' })).toMatchObject({
        data: { greeting: { hello: 'world' } },
        extensions: {
          responseCache: {
            didCache: true,
            hit: false,
          },
        },
      });

      expect(await query(gqlQuery, { test: 'b' })).toMatchObject({
        data: { greeting: { hello: 'world' } },
        extensions: {
          responseCache: {
            hit: true,
          },
        },
      });
    });

    async function query(
      graphqlQuery: string,
      extraHeaders: Record<string, string> = {},
    ): Promise<ExecutionResult> {
      const response = await meshHttp.fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify({ query: graphqlQuery }),
      });
      expect(response.status).toBe(200);
      return (await response.json()) as ExecutionResult;
    }
  });
});
