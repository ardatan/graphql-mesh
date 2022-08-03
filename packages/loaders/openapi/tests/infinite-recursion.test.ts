import loadGraphQLSchemaFromOpenAPI from '../src';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('Infinite Recursion', () => {
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('infinite-recursion', {
      oasFilePath: './fixtures/infinite-recursion.yml',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
