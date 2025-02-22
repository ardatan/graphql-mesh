import { basename, join } from 'path';
import { lexicographicSortSchema } from 'graphql';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh } from '@graphql-mesh/runtime';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

const store = new MeshStore('soap', new InMemoryStoreStorageAdapter(), {
  readonly: false,
  validate: false,
});

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
  store,
});
const mesh$ = config$.then(config => getMesh(config));
jest.setTimeout(30000);

describe('SOAP Demo', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(printSchemaWithDirectives(lexicographicSortSchema(schema))).toMatchSnapshot(
      'soap-demo-schema',
    );
  });
  it('should give correct response for example queries', async () => {
    const { documents } = await config$;
    const { execute } = await mesh$;
    for (const source of documents) {
      const result = await execute(source.document);
      expect(result.errors).toBeUndefined();
      expect(result).toMatchSnapshot(basename(source.location) + '-soap-demo-result');
    }
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
