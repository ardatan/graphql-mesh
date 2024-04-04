import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

describe('Empty Content', () => {
  it('generates the schema correctly', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('Empty Content', {
      source: './fixtures/empty-content.yaml',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('schema');
  });
});
