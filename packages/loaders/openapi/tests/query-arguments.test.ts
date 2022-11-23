/* eslint-disable import/no-nodejs-modules */
import { fetch } from '@whatwg-node/fetch';
import { graphql, GraphQLSchema } from 'graphql';
import { Server } from 'http';
import { AddressInfo } from 'net';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { getServer } from './query_arguments_server';

let server: Server;
let createdSchema: GraphQLSchema;

describe('OpenAPI loader: Query Arguments', () => {
  /**
   * Set up the schema first and run example API server
   */
  beforeAll(async () => {
    server = await getServer();
    const baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/`;
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch,
      baseUrl,
      source: './fixtures/query_arguments.json',
      cwd: __dirname,
    });
  });

  /**
   * Shut down API server
   */
  afterAll(done => {
    server.close(() => {
      done();
    });
  });

  it('Query Arguments', async () => {
    const query = /* GraphQL */ `
      {
        todos(id__in: [1, 2]) {
          id
        }
      }
    `;

    return graphql({ schema: createdSchema, source: query }).then(result => {
      expect(result).toEqual({
        data: {
          todos: [
            {
              id: 1,
            },
            {
              id: 2,
            },
          ],
        },
      });
    });
  });
});
