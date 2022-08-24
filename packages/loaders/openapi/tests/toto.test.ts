import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI, { createBundle } from '../src';

describe('Toto', () => {
  it('should generate the correct bundle', async () => {
    const bundle = await createBundle('toto', {
      source: './fixtures/toto.yml',
      cwd: __dirname,
    });
    expect(bundle).toMatchSnapshot();
  });
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('toto', {
      source: './fixtures/toto.yml',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
