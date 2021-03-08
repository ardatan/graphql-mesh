const { findAndParseConfig } = require('@graphql-mesh/config');
const { getMesh } = require('@graphql-mesh/runtime');
const { basename, join } = require('path');

const { introspectionFromSchema, lexicographicSortSchema } = require('graphql');
const { loadDocuments } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { mkdirSync, writeFileSync } = require('fs');

const problematicModulePath = join(__dirname, '../../../node_modules/core-js/features/array');
const emptyModuleContent = 'module.exports = {};';

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
jest.setTimeout(30000);

describe('Federation Example', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('federation-example-schema');
  });
  it('should give correct response for example queries', async () => {
    const [{
      config: {
        serve: { exampleQuery },
      },
    }] = await configAndServices$;
    const sources = await loadDocuments(join(__dirname, '..', exampleQuery), {
      loaders: [new GraphQLFileLoader()],
    });
    const { execute } = await mesh$;
    for (const source of sources) {
      const result = await execute(source.document);
      expect(result).toMatchSnapshot(basename(source.location) + '-federation-example-result');
    }
  });
  afterAll(() => {
      configAndServices$.then(([config,...services]) => services.map(service => service.stop()))
      mesh$.then(mesh => mesh.destroy());
  });
});
