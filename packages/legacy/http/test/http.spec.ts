import type { ExecutionResult } from 'graphql';
import { createMeshHTTPHandler } from '@graphql-mesh/http';
import { getTestMesh } from '../../testing/getTestMesh.js';

describe('http', () => {
  it('should not allow upper directory access when `staticFiles` is set', async () => {
    await using mesh = await getTestMesh();
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
  describe('health check', () => {
    it('should return 200', async () => {
      await using mesh = await getTestMesh();
      const httpHandler = createMeshHTTPHandler({
        baseDir: __dirname,
        getBuiltMesh: async () => mesh,
      });
      const response = await httpHandler.fetch('http://localhost:4000/healthcheck');
      expect(response.status).toBe(200);
    });
    it('should return 503 when not ready', async () => {
      await using mesh = await getTestMesh();
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
      await using mesh = await getTestMesh();
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
    it('throws when unprovided extra parameters are given in the request', async () => {
      await using mesh = await getTestMesh();
      const httpHandler = createMeshHTTPHandler({
        baseDir: __dirname,
        getBuiltMesh: async () => mesh,
      });
      const response = await httpHandler.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `query { __typename }`,
          extraParam: 'extraParamValue',
        }),
      });
      expect(response.status).toBe(400);
      const result: ExecutionResult = await response.json();
      expect(result.errors[0].message).toBe(
        'Unexpected parameter "extraParam" in the request body.',
      );
    });
    it('respects the extra parameters given in the config', async () => {
      await using mesh = await getTestMesh();
      const httpHandler = createMeshHTTPHandler({
        baseDir: __dirname,
        getBuiltMesh: async () => mesh,
        rawServeConfig: {
          extraParamNames: ['extraParam'],
        },
      });
      const response = await httpHandler.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `query { __typename }`,
          extraParam: 'extraParamValue',
        }),
      });
      expect(response.status).toBe(200);
      const result: ExecutionResult = await response.json();
      expect(result.data.__typename).toBe('Query');
    });
    it('throws when unprovided extra parameters are given in the request while there are provided some', async () => {
      await using mesh = await getTestMesh();
      const httpHandler = createMeshHTTPHandler({
        baseDir: __dirname,
        getBuiltMesh: async () => mesh,
        rawServeConfig: {
          extraParamNames: ['extraParam'],
        },
      });
      const response = await httpHandler.fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `query { __typename }`,
          extraParam1: 'extraParamValue',
        }),
      });
      expect(response.status).toBe(400);
      const result: ExecutionResult = await response.json();
      expect(result.errors[0].message).toBe(
        'Unexpected parameter "extraParam1" in the request body.',
      );
    });
  });
});
