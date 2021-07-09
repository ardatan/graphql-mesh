const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { lexicographicSortSchema } = require('graphql');
const { mkdirSync, readFileSync, writeFileSync } = require('fs');

const problematicModulePath = join(__dirname, '../../../node_modules/core-js/features/array');
const emptyModuleContent = 'module.exports = {};';

const exampleQuery = readFileSync(join(__dirname, '../example-query.graphql'), 'utf8');
const exampleResult = require('./federation-example-result.json');

// Fix core-js issue
mkdirSync(problematicModulePath, { recursive: true });
writeFileSync(join(problematicModulePath, './flat.js'), emptyModuleContent);
writeFileSync(join(problematicModulePath, './flat-map.js'), emptyModuleContent);

const configAndServices$ = Promise.all([
    findAndParseConfig({
        dir: join(__dirname, '..'),
    }),
    require('../services/accounts'),
    require('../services/inventory'),
    require('../services/products'),
    require('../services/reviews'),
]);
const mesh$ = configAndServices$.then(([config]) => getMesh(config));


describe('Federation Example', () => {
  it('should give correct response for example queries', async () => {
    const { execute } = await mesh$;
    const result = await execute(exampleQuery);
    expect(result?.data).toEqual(exampleResult);
  });
  afterAll(() => {
      configAndServices$.then(([config,...services]) => services.map(service => service.stop()))
      mesh$.then(mesh => mesh.destroy());
  });
});
