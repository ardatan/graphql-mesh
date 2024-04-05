import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Multiple Responses Swagger', () => {
  it('should create correct response types with 204 empty response', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/multiple-responses-swagger.yml',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('schema');
  });
});
