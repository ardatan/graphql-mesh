import { createMeshHTTPHandler } from '@graphql-mesh/http';
import { MeshInstance } from '@graphql-mesh/runtime';
import { getTestMesh } from '../../testing/getTestMesh.js';

describe('http', () => {
  let mesh: MeshInstance;
  beforeEach(async () => {
    mesh = await getTestMesh();
  });
  it('should not allow upper directory access when `staticFiles` is set', async () => {
    const httpHandler = createMeshHTTPHandler({
      baseDir: __dirname,
      getBuiltMesh: async () => mesh,
      rawServeConfig: {
        staticFiles: './fixtures/static-files',
      },
    });
    const response = await httpHandler.fetch(
      'http://localhost:4000/..%2f/..%2f/..%2f/package.json',
    );
    expect(response.status).toBe(404);
  });
  afterEach(() => {
    mesh.destroy();
  });
});
