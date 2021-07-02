const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { lexicographicSortSchema } = require('graphql');
const { mkdirSync, readFileSync, writeFileSync } = require('fs');
const { printSchemaWithDirectives } = require('@graphql-tools/utils');
const StitchingMerger = require('@graphql-mesh/merger-stitching').default;

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
const meshWithFederation$ = configAndServices$.then(([config]) => getMesh(config));
const meshWithStitching$ = configAndServices$.then(([config]) => getMesh({
  ...config,
  merger: new StitchingMerger(config)
}));
jest.setTimeout(30000);


describe('Federation Example', () => {
  it('should give correct response for example queries', async () => {
    const { execute } = await meshWithFederation$;
    const result = await execute(exampleQuery);
    expect(result?.data).toEqual(exampleResult);
  });

  it('should give correct responses with stitching as well', async () => {
    const [{
      documents,
    }] = await configAndServices$;
    const { execute } = await meshWithStitching$;
    const result = await execute(exampleQuery);
    expect(result?.data).toEqual(exampleResult);
  });
  afterAll(() => {
      configAndServices$.then(([config,...services]) => services.map(service => service.stop()))
      meshWithFederation$.then(meshWithFederation => meshWithFederation.destroy());
      meshWithStitching$.then(meshWithStitching => meshWithStitching.destroy());
  });
});
