import { findAndParseConfig } from '@graphql-mesh/cli';
import { MeshInstance, getMesh } from '@graphql-mesh/runtime';
import { join } from 'path';
import { accountsServer } from '../services/accounts';
import { inventoryServer } from '../services/inventory';
import { productsServer } from '../services/products';
import { reviewsServer } from '../services/reviews';
import { ApolloServer } from 'apollo-server';

import { mkdirSync, readFileSync, writeFileSync } from 'fs';

const problematicModulePath = join(__dirname, '../../../node_modules/core-js/features/array');
const emptyModuleContent = 'module.exports = {};';

const exampleQuery = readFileSync(join(__dirname, '../gateway/example-query.graphql'), 'utf8');

// Fix core-js issue
mkdirSync(problematicModulePath, { recursive: true });
writeFileSync(join(problematicModulePath, './flat.js'), emptyModuleContent);
writeFileSync(join(problematicModulePath, './flat-map.js'), emptyModuleContent);

describe('Federation Example', () => {
  let mesh;
  let servicesToStop: Array<ApolloServer> = [];
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
