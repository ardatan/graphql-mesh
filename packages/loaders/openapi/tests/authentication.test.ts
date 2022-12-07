/* eslint-disable import/no-nodejs-modules */
import { execute, parse } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';
import { startServer } from './example_api_server.js';
import { fetch } from '@whatwg-node/fetch';
import { Server } from 'http';
import { AddressInfo } from 'net';

// We don't create viewers for each security scheme definition in OAS like openapi-to-graphql
// But instead we let user to define them with string interpolation
// No need to test every single query and mutation because this only tests the interpolation behavior

describe('OpenAPI Loader: Authentication', () => {
  /**
   * Set up the schema first and run example API server
   */
  let endpoint: string;
  let server: Server;

  beforeAll(async () => {
    server = await startServer();
    endpoint = `http://localhost:${(server.address() as AddressInfo).port}/api`;
  });

  /**
   * Shut down API server
   */
  afterAll(done => {
    server.close(() => {
      done();
    });
  });

  it('should get patent using basic auth', async () => {
    const query = /* GraphQL */ `
      query {
        get_patent_with_id(patent_id: "100", usernameAndPassword: "arlene123:password123") {
          patent_id
        }
      }
    `;

    const createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/example_oas.json',
      cwd: __dirname,
      endpoint,
      operationHeaders: {
        authorization: 'Basic {args.usernameAndPassword|base64}',
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
      source: './fixtures/example_oas.json',
      cwd: __dirname,
      endpoint,
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
      source: './fixtures/example_oas.json',
      cwd: __dirname,
      endpoint,
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
      source: './fixtures/example_oas.json',
      cwd: __dirname,
      endpoint,
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
