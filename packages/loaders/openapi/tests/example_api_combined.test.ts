/* eslint-disable import/no-nodejs-modules */
import { execute, GraphQLSchema, parse } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { startServer } from './example_api_server';
import { Server } from 'http';
import { AddressInfo } from 'net';

describe('Example API Combined', () => {
  let createdSchema: GraphQLSchema;
  let server: Server;
  beforeAll(async () => {
    server = await startServer();
    const baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/api`;
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api_combined', {
      source: './fixtures/example_oas_combined.json',
      cwd: __dirname,
      baseUrl,
      fetch,
    });
  });

  afterAll(done => {
    server.close(() => {
      done();
    });
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
