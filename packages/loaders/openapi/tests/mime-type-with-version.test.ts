import { join } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

describe('MIME Type with Version', () => {
  it('generates the schema correctly', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: join(__dirname, './fixtures/orbit.json'),
      operationHeaders: {
        accept: 'application/json;v=2',
      },
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
