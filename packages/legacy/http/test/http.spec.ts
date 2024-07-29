import type { IncomingMessage } from 'http';
import { request } from 'http';
import { gunzipSync, gzipSync } from 'zlib';
import type { ExecutionResult } from 'graphql';
import { createMeshHTTPHandler } from '@graphql-mesh/http';
import type { MeshPlugin } from '@graphql-mesh/types';
import { useContentEncoding } from '@whatwg-node/server';
import { createDisposableServer } from '../../../testing/createDisposableServer.js';
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
  it('handles compressed data', async () => {
    await using mesh = await getTestMesh({
      additionalEnvelopPlugins: [useContentEncoding() as MeshPlugin<{}>],
    });
    const httpHandler = createMeshHTTPHandler({
      baseDir: __dirname,
      getBuiltMesh: async () => mesh,
    });
    const response = await httpHandler.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      },
      body: gzipSync(
        Buffer.from(
          JSON.stringify({
            query: `query { __typename }`,
          }),
        ),
      ),
    });
    expect(response.status).toBe(200);
    const result: ExecutionResult = await response.json();
    expect(result.data.__typename).toBe('Query');
  });
  it('returns compressed data if asked', async () => {
    await using mesh = await getTestMesh({
      additionalEnvelopPlugins: [useContentEncoding() as MeshPlugin<{}>],
    });
    const httpHandler = createMeshHTTPHandler({
      baseDir: __dirname,
      getBuiltMesh: async () => mesh,
    });
    await using server = await createDisposableServer(httpHandler);
    const addressInfo = server.address();
    const req = request({
      host: 'localhost',
      port: addressInfo.port,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept-encoding': 'gzip', // ask for gzip
      },
    });
    req.write(
      JSON.stringify({
        query: `query { __typename }`,
      }),
    );
    req.end();
    const res: IncomingMessage = await new Promise((resolve, reject) => {
      req.on('response', resolve);
      req.on('error', reject);
    });
    const chunks: Buffer[] = [];
    await new Promise<void>(resolve => {
      res.on('data', chunk => {
        chunks.push(chunk as Buffer);
      });
      res.on('end', resolve);
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
    const finalRes = Buffer.concat(chunks);
    expect(finalRes.length.toString()).toBe(res.headers['content-length']);
    const result: ExecutionResult = JSON.parse(gunzipSync(finalRes).toString());
    expect(result.data.__typename).toBe('Query');
  });
});
