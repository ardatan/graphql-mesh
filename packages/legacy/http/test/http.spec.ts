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
  describe('health check', () => {
    it('should return 200', async () => {
      const httpHandler = createMeshHTTPHandler({
        baseDir: __dirname,
        getBuiltMesh: async () => mesh,
      });
      const response = await httpHandler.fetch('http://localhost:4000/healthcheck');
      expect(response.status).toBe(200);
    });
    it('should return 503 when not ready', async () => {
      let resolve: VoidFunction;
      const readyPromise = new Promise<void>(r => {
        resolve = r;
      });
      const httpHandler = createMeshHTTPHandler({
        baseDir: __dirname,
        getBuiltMesh: async () => {
          await readyPromise;
          return mesh;
        },
      });
      const response = await httpHandler.fetch('http://localhost:4000/readiness');
      expect(response.status).toBe(503);
      resolve();
    });
    it('should be able to customize health check endpoint', async () => {
      const httpHandler = createMeshHTTPHandler({
        baseDir: __dirname,
        getBuiltMesh: async () => mesh,
        rawServeConfig: {
          healthCheckEndpoint: '/custom-health-check',
        },
      });
      const response = await httpHandler.fetch('http://localhost:4000/custom-health-check');
      expect(response.status).toBe(200);
    });
  });
});
