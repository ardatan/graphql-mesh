const { findAndParseConfig } = require('@graphql-mesh/cli');
const { getMesh } = require('@graphql-mesh/runtime');
const { join } = require('path');

const { mkdirSync, readFileSync, writeFileSync } = require('fs');

const problematicModulePath = join(__dirname, '../../../node_modules/core-js/features/array');
const emptyModuleContent = 'module.exports = {};';

const exampleQuery = readFileSync(join(__dirname, '../gateway/example-query.graphql'), 'utf8');

// Fix core-js issue
mkdirSync(problematicModulePath, { recursive: true });
writeFileSync(join(problematicModulePath, './flat.js'), emptyModuleContent);
writeFileSync(join(problematicModulePath, './flat-map.js'), emptyModuleContent);

describe('Federation Example', () => {
  let mesh;
  let servicesToStop;
  beforeAll(async () => {
    const [config, ...services] = await Promise.all([
      findAndParseConfig({
        dir: join(__dirname, '../gateway'),
      }),
      require('../services/accounts'),
      require('../services/inventory'),
      require('../services/products'),
      require('../services/reviews'),
    ]);
    servicesToStop = services;
    mesh = await getMesh(config);
  });
  afterAll(async () => {
    await Promise.all(servicesToStop.map(service => service.stop()));
    mesh.destroy();
  });
  it('should give correct response for example queries', async () => {
    const result = await mesh.execute(exampleQuery);
    expect(result?.errors).toBeFalsy();
    expect(result?.data).toMatchSnapshot();
  });
});
