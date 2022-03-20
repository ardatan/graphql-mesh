import { join } from 'path';
import { fs } from '@graphql-mesh/cross-helpers';

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
    const meshSdk = await getMeshSDK();
    const sdkResult = await meshSdk.ExampleMeQuery();
    expect(sdkResult?.me?.firstName).toBeDefined();
    expect(sdkResult?.me?.jobTitle).toBeDefined();
    expect(sdkResult?.me?.lastName).toBeDefined();
    expect(sdkResult?.me?.company?.name).toBeDefined();
    expect(sdkResult?.me?.company?.type).toBeDefined();
    expect(sdkResult?.me?.company?.employers).toHaveLength(2);
    expect(sdkResult?.me?.company?.employers[0]?.firstName).toBeDefined();
    expect(sdkResult?.me?.company?.employers[0]?.jobTitle).toBeDefined();
  });
});
