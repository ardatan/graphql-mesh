import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI, { createBundle } from '../src';

describe('DeepL', () => {
  it('should generate the correct bundle', async () => {
    const bundle = await createBundle('deepl', {
      source: './fixtures/deepl.json',
      cwd: __dirname,
    });
    expect(bundle).toMatchSnapshot();
  });
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('deepl', {
      source: './fixtures/deepl.json',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
