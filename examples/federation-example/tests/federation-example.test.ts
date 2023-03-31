import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { accountsServer } from '../services/accounts/server';
import { inventoryServer } from '../services/inventory/server';
import { productsServer } from '../services/products/server';
import { reviewsServer } from '../services/reviews/server';

const problematicModulePath = join(__dirname, '../../../node_modules/core-js/features/array');
const emptyModuleContent = 'module.exports = {};';

const exampleQuery = readFileSync(join(__dirname, '../gateway/example-query.graphql'), 'utf8');

// Fix core-js issue
mkdirSync(problematicModulePath, { recursive: true });
writeFileSync(join(problematicModulePath, './flat.js'), emptyModuleContent);
writeFileSync(join(problematicModulePath, './flat-map.js'), emptyModuleContent);

describe('Federation Example', () => {
  let mesh: MeshInstance;
  let servicesToStop: Array<{
    stop: () => Promise<void>;
  }> = [];
  beforeAll(async () => {
    const [config, ...services] = await Promise.all([
      findAndParseConfig({
        dir: join(__dirname, '../gateway'),
      }),
      accountsServer(),
      inventoryServer(),
      productsServer(),
      reviewsServer(),
    ]);
    servicesToStop = [...services];
    mesh = await getMesh(config);
  });
  afterAll(async () => {
    await Promise.all(servicesToStop.map(service => service.stop()));
    mesh.destroy();
  });
  it('should give correct response for example queries', async () => {
    const result = await mesh.execute(exampleQuery, undefined);
    expect(result?.errors).toBeFalsy();
    expect(result?.data).toMatchSnapshot();
  });
});
