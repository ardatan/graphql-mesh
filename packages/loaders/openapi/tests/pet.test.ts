import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src';

describe('Pet', () => {
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('toto', {
      source: './fixtures/pet.yml',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
