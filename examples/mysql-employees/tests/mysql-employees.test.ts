import { basename, join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

jest.setTimeout(30000);

describe('MySQL Employees', () => {
  let mesh: MeshInstance;
  let config: ProcessedConfig;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(mesh.schema)).toMatchSnapshot('schema');
  });
  it('should give correct response for example queries', () =>
    Promise.all(
      config.documents.map(async operation => {
        const result = await mesh.execute(operation.document!);
        expect(result).toMatchSnapshot(
          basename(operation.location || 'anonymous') + '-query-result',
        );
      }),
    ));
  afterAll(() => {
    mesh?.destroy();
  });
});
