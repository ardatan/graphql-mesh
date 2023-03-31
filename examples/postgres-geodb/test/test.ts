import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { MeshInstance } from '@graphql-mesh/runtime';
import { getMesh } from '@graphql-mesh/runtime';

jest.setTimeout(30000);

describe('PostgresGeoDB', () => {
  let config: ProcessedConfig;
  let mesh: MeshInstance;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  it('should give correct response for example queries', async () => {
    const result = await mesh.execute(config.documents[0].document!, {});
    expect(result?.data?.allCities?.nodes?.[0]?.countrycode).toBeTruthy();
    expect(result?.data?.allCities?.nodes?.[0]?.developers?.[0]?.login).toBeTruthy();
  });
  afterAll(() => {
    mesh.destroy();
  });
});
