import { execute, GraphQLSchema, parse } from 'graphql';
import { join } from 'path';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { startServer, stopServer } from '../../../handlers/openapi/test/example_api_server';

const PORT = 3010;
const oasFilePath = join(__dirname, '../../../handlers/openapi/test/fixtures/example_oas_combined.json');
const baseUrl = `http://localhost:${PORT}/api`;

describe('Example API Combined', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    await startServer(PORT);
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      oasFilePath,
      baseUrl,
      fetch,
    });
  });
  afterAll(async () => {
    await stopServer();
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('example_oas_combined-schema');
  });
  it('should handle allOf correctly', async () => {
    const query = /* GraphQL */ `
      query {
        getAllCars {
          model
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toMatchSnapshot('example_oas_combined-query-result');
  });
});
