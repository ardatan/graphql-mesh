import { join } from 'path';
import { DEFAULT_CLI_PARAMS, serveMesh } from '@graphql-mesh/cli';
import { fs } from '@graphql-mesh/cross-helpers';
import { Logger } from '@graphql-mesh/types';
import { TerminateHandler } from '../../../packages/legacy/utils/dist/typings/registerTerminateHandler';

const { readFile } = fs.promises;

describe('Artifacts', () => {
  it('should execute queries', async () => {
    const { getBuiltMesh } = await import('../.mesh/index');
    const { execute } = await getBuiltMesh();
    const query = await readFile(join(__dirname, '../example-query.graphql'), 'utf-8');
    const executionResult = await execute(query, {});
    expect(executionResult?.data?.me?.firstName).toBeDefined();
    expect(executionResult?.data?.me?.jobTitle).toBeDefined();
    expect(executionResult?.data?.me?.lastName).toBeDefined();
    expect(executionResult?.data?.me?.company?.name).toBeDefined();
    expect(executionResult?.data?.me?.company?.type).toBeDefined();
    expect(executionResult?.data?.me?.company?.employers).toHaveLength(2);
    expect(executionResult?.data?.me?.company?.employers[0]?.firstName).toBeDefined();
    expect(executionResult?.data?.me?.company?.employers[0]?.jobTitle).toBeDefined();
    expect(executionResult?.data?.me?.company?.employers[0]?.lastName).toBeDefined();
  });
  it('should load and run SDK correctly', async () => {
    const { getMeshSDK } = await import('../.mesh/index');
    const meshSdk = getMeshSDK();
    const sdkResult = await meshSdk.ExampleMeQuery();
    expect(sdkResult?.me?.firstName).toBeDefined();
    expect(sdkResult?.me?.jobTitle).toBeDefined();
    expect(sdkResult?.me?.lastName).toBeDefined();
    expect(sdkResult?.me?.company?.name).toBeDefined();
    expect(sdkResult?.me?.company?.type).toBeDefined();
    expect(sdkResult?.me?.company?.employers).toHaveLength(2);
    expect(sdkResult?.me?.company?.employers?.[0]?.firstName).toBeDefined();
    expect(sdkResult?.me?.company?.employers?.[0]?.jobTitle).toBeDefined();
  });
  it('should fallback to node:http when uWebSockets.js is not available', async () => {
    const terminateHandlers: TerminateHandler[] = [];
    try {
      const { getBuiltMesh } = await import('../.mesh/index');
      jest.mock('uWebSockets.js', () => {
        throw new Error('uWebSockets.js is not available');
      });
      const mockLogger: Logger = {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        log: jest.fn(),
        child: jest.fn(() => mockLogger),
      };
      await serveMesh(
        {
          baseDir: join(__dirname, '..'),
          argsPort: 4000,
          getBuiltMesh,
          logger: mockLogger,
          rawServeConfig: {
            browser: false,
          },
          registerTerminateHandler(terminateHandler) {
            terminateHandlers.push(terminateHandler);
          },
        },
        DEFAULT_CLI_PARAMS,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'uWebSockets.js is not available currently so the server will fallback to node:http.',
      );
    } finally {
      jest.resetModules();
      await Promise.all(terminateHandlers.map(terminateHandler => terminateHandler('SIGTERM')));
    }
  });
});
