import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI, { createBundle } from '../src';

describe('Deduplication', () => {
  it('should deduplicate the similar types in the GraphQL Schema by default', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('deduplicated', {
      oasFilePath: './fixtures/deduplication.json',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
  it('should deduplicate the similar types in the bundle by default', async () => {
    const bundle = await createBundle('deduplicated', {
      oasFilePath: './fixtures/deduplication.json',
      cwd: __dirname,
    });
    expect(bundle).toMatchSnapshot();
  });
  it('should keep the similar types in the GraphQL Schema with noDeduplication flag', async () => {
    const bundle = await createBundle('kept-as-is', {
      oasFilePath: './fixtures/deduplication.json',
      cwd: __dirname,
      noDeduplication: true,
    });
    expect(bundle).toMatchSnapshot();
  });
  it('should keep the similar types in the bundle with noDeduplication flag', async () => {
    const bundle = await createBundle('deduplicated', {
      oasFilePath: './fixtures/deduplication.json',
      cwd: __dirname,
    });
    expect(bundle).toMatchSnapshot();
  });
});
