import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';
import { generateOperations } from '../../../cli/src/commands/generate-operations.js';

describe('Test', () => {
  it('should generate the correct schema', async () => {
    // Generate the schema
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/test.json',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();

    // Generate the operations
    const documents = generateOperations(schema, { selectionSetDepth: 3 });
    expect(documents).toBeDefined();
  });
});
