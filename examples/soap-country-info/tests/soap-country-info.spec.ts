import { readFile } from 'fs/promises';
import { join } from 'path';
import { lexicographicSortSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('SOAP Country Info', () => {
  let config: ProcessedConfig;
  let mesh: MeshInstance;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  afterAll(() => {
    mesh.destroy();
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(lexicographicSortSchema(mesh.schema))).toMatchSnapshot();
  });
  it('should give correct response for the batched example query', async () => {
    const queryStr = await readFile(
      join(__dirname, '..', 'list-of-languages-by-name.graphql'),
      'utf-8',
    );
    const result = await mesh.execute(queryStr, {});
    expect(result?.errors?.[0]?.stack).toBeUndefined();
    expect(result).toMatchSnapshot('list-of-languages-by-name-result');
  });
});
