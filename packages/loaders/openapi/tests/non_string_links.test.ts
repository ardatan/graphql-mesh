import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Links on non-object fields', () => {
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('toto', {
      source: './fixtures/non_string_links.yml',
      cwd: __dirname,
      fetch,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
