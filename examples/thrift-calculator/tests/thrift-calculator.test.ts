import { mkdirSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { ProcessedConfig } from '../../../packages/legacy/config/dist/typings/process';
import thriftServer from '../src/main';

const problematicModulePath = join(__dirname, '../../../node_modules/core-js/modules');
const emptyModuleContent = 'module.exports = {};';

// Fix core-js issue
mkdirSync(problematicModulePath, { recursive: true });
writeFileSync(join(problematicModulePath, './es.array.join.js'), emptyModuleContent);

jest.setTimeout(30000);

describe('Thrift Calculator', () => {
  let config: ProcessedConfig;
  let mesh: MeshInstance;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(mesh.schema)).toMatchSnapshot('thrift-calculator-schema');
  });
  it('should give correct response for example queries', async () => {
    for (const source of config.documents) {
      if (!source.document || !source.location) {
        throw new Error(`Invalid source: ${source.location}`);
      }
      const result = await mesh.execute(source.document);
      expect(result.errors).toBeFalsy();
      expect(result).toMatchSnapshot(basename(source.location) + '-thrift-calculator-result');
    }
  });
  afterAll(() => {
    mesh?.destroy();
    thriftServer.close();
  });
});
