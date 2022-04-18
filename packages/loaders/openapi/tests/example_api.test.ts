import { execute, GraphQLObjectType, GraphQLSchema, parse } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

import { startServer, stopServer } from '../../../handlers/openapi/test/example_api_server';
import { join } from 'path';
import { fetch } from 'cross-undici-fetch';

let createdSchema: GraphQLSchema;
const PORT = 3002;
const baseUrl = `http://localhost:${PORT}/api`;

describe('example_api', () => {
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      fetch,
      baseUrl,
      oasFilePath: join(__dirname, '../../../handlers/openapi/test/fixtures/example_oas.json'),
    });
    await startServer(PORT);
  });
  afterAll(() => stopServer());

  it('should get descriptions', async () => {
    // Get all the descriptions of the fields on the GraphQL object type car
    const carType = createdSchema.getType('car') as GraphQLObjectType;
    expect(carType).toBeDefined();
    const carFields = carType.getFields();
    expect(carFields).toBeDefined();
    expect(carFields.model.description).toBe('The model of the car.');
    expect(carFields.color.description).toBe('The color of the car.');
  });

  it('should get resource (incl. enum)', async () => {
    // Status is an enum
    const query = `{
    getUserByUsername (username: "arlene") {
      name
      status
    }
  }`;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });

    expect(result).toEqual({
      data: { getUserByUsername: { name: 'Arlene L McMahon', status: 'staff' } },
    });
  });

  // OAS allows you to define response objects with HTTP code with the XX wildcard syntax
  it('should get resource with status code: 2XX', async () => {
    const query = `{
    getPapers {
      name
      published
    }
  }`;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        getPapers: [
          { name: 'Deliciousness of apples', published: true },
          { name: 'How much coffee is too much coffee?', published: false },
          {
            name: 'How many tennis balls can fit into the average building?',
            published: true,
          },
        ],
      },
    });
  });

  /**
   * Some operations do not have a response body.
   */
  it('should get resource with no response schema and status code: 204', async () => {
    const query = `{
    getBonuses
  }`;

    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        getBonuses: '',
      },
    });
  });
});
