import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src';

describe('Links on non-object fields', () => {
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('toto', {
      source: './fixtures/non_string_links.yml',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
