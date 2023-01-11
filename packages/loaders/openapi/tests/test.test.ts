import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';
import { generateOperations } from '../../../cli/src/commands/generate-operations.js';

describe('Test', () => {
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/test.json',
      cwd: __dirname,
    });
    generateOperations(schema, { selectionSetDepth: 3 });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
