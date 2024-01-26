import { join } from 'path';
import { ExecutionResult } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import { MeshInstance } from '@graphql-mesh/runtime';
import { getTestMesh } from '../../../packages/testing/getTestMesh';

const baseDir = join(__dirname, '..');

describe('Hello World', () => {
  let mesh: MeshInstance;
  let meshHttp: MeshHTTPHandler;

  beforeAll(async () => {
    const config = await findAndParseConfig({ dir: baseDir });
    mesh = await getTestMesh(config);
    meshHttp = createMeshHTTPHandler({
      baseDir,
      getBuiltMesh: () => Promise.resolve(mesh),
    });
  });

  afterAll(() => mesh.destroy());

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
});
