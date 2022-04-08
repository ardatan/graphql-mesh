import { execute, parse } from 'graphql';
import { join } from 'path';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { startServer, stopServer } from '../../../handlers/openapi/test/example_api_server';
import { fetch } from 'cross-undici-fetch';

const PORT = 3003;
const oasFilePath = join(__dirname, '../../../handlers/openapi/test/fixtures/example_oas.json');
const baseUrl = `http://localhost:${PORT}/api`;

// We don't create viewers for each security scheme definition in OAS like openapi-to-graphql
// But instead we let user to define them with string interpolation
// No need to test every single query and mutation because this only tests the interpolation behavior

describe('Authentication', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    await startServer(PORT);
  });
  /**
   * Shut down API server
   */
  afterAll(async () => {
    await stopServer();
  });
  it('Get patent using basic auth', async () => {
    const query = /* GraphQL */ `
      query {
        get_patent_with_id(patent_id: "100", usernameAndPassword: "arlene123:password123") {
          patent_id
        }
      }
    `;
    const createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      oasFilePath,
      baseUrl,
      operationHeaders: {
        Authorization: 'Basic {args.usernameAndPassword|base64}',
      },
      fetch,
    });
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        get_patent_with_id: {
          patent_id: '100',
        },
      },
    });
  });
  it('Get patent using API key in the header', async () => {
    const query = /* GraphQL */ `
      query {
        get_patent_with_id(patent_id: "100", apiKey: "abcdef") {
          patent_id
        }
      }
    `;
    const createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      oasFilePath,
      baseUrl,
      operationHeaders: {
        access_token: '{args.apiKey}',
      },
      fetch,
    });
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        get_patent_with_id: {
          patent_id: '100',
        },
      },
    });
  });
  it('Get patent using API key in the cookie', async () => {
    const query = /* GraphQL */ `
      query {
        get_patent_with_id(patent_id: "100", apiKey: "abcdef") {
          patent_id
        }
      }
    `;
    const createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      oasFilePath,
      baseUrl,
      operationHeaders: {
        cookie: 'access_token={args.apiKey}',
      },
      fetch,
    });
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        get_patent_with_id: {
          patent_id: '100',
        },
      },
    });
  });
  it('Get patent using API key in the query string', async () => {
    const query = /* GraphQL */ `
      query {
        get_patent_with_id(patent_id: "100", apiKey: "abcdef") {
          patent_id
        }
      }
    `;
    const createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      oasFilePath,
      baseUrl,
      queryParams: {
        access_token: '{args.apiKey}',
      },
      fetch,
    });
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: {
        get_patent_with_id: {
          patent_id: '100',
        },
      },
    });
  });
});
