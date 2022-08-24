import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI, { createBundle } from '../src';

describe('OpenAPI Loader: Github', () => {
  it('should generate the correct bundle', async () => {
    const bundle = await createBundle('github', {
      source: './fixtures/github.json',
      cwd: __dirname,
    });
    expect(bundle).toMatchSnapshot();
  });
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('github', {
      source: './fixtures/github.json',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
