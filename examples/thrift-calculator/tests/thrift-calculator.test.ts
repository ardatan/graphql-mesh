import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import { basename, join } from 'path';
import { introspectionFromSchema, lexicographicSortSchema } from 'graphql';
import { loadDocuments } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import thriftServer from '../src/main';
import { mkdirSync, writeFileSync } from 'fs';

const problematicModulePath = join(__dirname, '../../../node_modules/core-js/modules');
const emptyModuleContent = 'module.exports = {};';

// Fix core-js issue
mkdirSync(problematicModulePath, { recursive: true });
writeFileSync(join(problematicModulePath, './es.array.join.js'), emptyModuleContent);

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(30000);

describe('Thrift Calculator', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot('thrift-calculator-schema');
  });
  it('should give correct response for example queries', async () => {
    const { documents } = await config$;
    const { execute } = await mesh$;
    for (const source of documents) {
      const result = await execute(source.document, {});
      expect(result.errors).toBeFalsy();
      expect(result).toMatchSnapshot(basename(source.location) + '-thrift-calculator-result');
    }
  });
  afterAll(() => {
    mesh$.then(mesh => mesh.destroy());
    thriftServer.close();
  });
});
