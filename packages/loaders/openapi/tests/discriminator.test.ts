import { execute, parse } from 'graphql';
import type { GraphQLSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { getJSONSchemaOptionsFromOpenAPIOptions } from '../src/getJSONSchemaOptionsFromOpenAPIOptions.js';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

function expectRecord(value: unknown): asserts value is Record<string, unknown> {
  expect(value).toEqual(expect.any(Object));
  expect(Array.isArray(value)).toBe(false);
}

describe('Discriminator Mapping', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/discriminator-mapping.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      async fetch(url) {
        if (url === 'pets/1') {
          return Response.json({
            petType: 'Dog',
            dog_exclusive: 'DOG_EXCLUSIVE',
          });
        }
        if (url === 'pets/2') {
          return Response.json({
            petType: 'Cat',
            cat_exclusive: 'CAT_EXCLUSIVE',
          });
        }
        return new Response(null, {
          status: 404,
        });
      },
      // It is not possible to provide a union type with File scalar
    });
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('discriminator-mapping');
  });
  it('should handle discriminator mapping', async () => {
    const query = /* GraphQL */ `
      query {
        dog: pets_by_id(id: "1") {
          __typename
          ... on DogDifferent {
            petType
          }
        }
        cat: pets_by_id(id: "2") {
          __typename
          ... on Cat {
            petType
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        dog: {
          __typename: 'DogDifferent',
          petType: 'Dog',
        },
        cat: {
          __typename: 'Cat',
          petType: 'Cat',
        },
      },
    });
  });
});

describe('Inline Discriminator Mapping', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/discriminator-inline.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      async fetch(url) {
        if (url === 'things') {
          return Response.json([
            {
              id: '1',
              type: 'cat',
              name: 'Luna',
              data: {},
            },
            {
              id: '2',
              type: 'dog',
              name: 'Milo',
              data: {},
            },
          ]);
        }
        return new Response(null, {
          status: 404,
        });
      },
    });
  });

  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('discriminator-inline');
  });

  it('should handle inline discriminator mapping', async () => {
    const query = /* GraphQL */ `
      query {
        things {
          __typename
          ... on Cat {
            id
            type
            name
          }
          ... on Dog {
            id
            type
            name
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        things: [
          {
            __typename: 'Cat',
            id: '1',
            type: 'cat',
            name: 'Luna',
          },
          {
            __typename: 'Dog',
            id: '2',
            type: 'dog',
            name: 'Milo',
          },
        ],
      },
    });
  });
});

describe('External Relative Discriminator Mapping', () => {
  it('should resolve relative mapping values by JSON Pointer fragment', async () => {
    const options = await getJSONSchemaOptionsFromOpenAPIOptions('test', {
      source: './fixtures/discriminator-external/openapi/api.yml',
      cwd: __dirname,
    });
    const operation = options.operations.find(operation => operation.field === 'externalThings');
    expectRecord(operation);
    const responseByStatusCode = operation.responseByStatusCode;
    expectRecord(responseByStatusCode);
    expectRecord(responseByStatusCode['200']);
    const responseSchema = responseByStatusCode['200'].responseSchema;
    expectRecord(responseSchema);
    expectRecord(responseSchema.items);
    const discriminatorMapping = responseSchema.items.discriminatorMapping;
    expectRecord(discriminatorMapping);
    expect(discriminatorMapping.cat).toMatchObject({
      properties: {
        externalOnly: {
          type: 'string',
        },
      },
    });
    expect(discriminatorMapping.cat).not.toMatchObject({
      properties: {
        localOnly: {
          type: 'string',
        },
      },
    });

    const createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/discriminator-external/openapi/api.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      async fetch(url) {
        if (url === 'things') {
          return Response.json([
            {
              id: '1',
              type: 'dog',
              name: 'Milo',
            },
          ]);
        }
        return new Response(null, {
          status: 404,
        });
      },
    });
    const query = /* GraphQL */ `
      query {
        externalThings {
          __typename
          ... on Dog {
            id
            type
            name
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        externalThings: [
          {
            __typename: 'Dog',
            id: '1',
            type: 'dog',
            name: 'Milo',
          },
        ],
      },
    });
  });
});

describe('Inline Discriminator Mapping (request body)', () => {
  let createdSchema: GraphQLSchema;
  const receivedBodies: unknown[] = [];
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/discriminator-inline-request.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      async fetch(url, init) {
        if (url === 'things' && init?.method === 'POST') {
          const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
          receivedBodies.push(body);
          return Response.json({
            id: '1',
            type: body.type,
            name: body.name,
          });
        }
        return new Response(null, {
          status: 404,
        });
      },
    });
  });

  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot(
      'discriminator-inline-request',
    );
  });

  it('should attach discriminator mapping to inline request body schema', async () => {
    const options = await getJSONSchemaOptionsFromOpenAPIOptions('test', {
      source: './fixtures/discriminator-inline-request.yml',
      cwd: __dirname,
    });
    const operation = options.operations.find(operation => operation.field === 'createThing');
    expectRecord(operation);
    const requestSchema = operation.requestSchema;
    expectRecord(requestSchema);
    const discriminatorMapping = requestSchema.discriminatorMapping;
    expectRecord(discriminatorMapping);
    expectRecord(discriminatorMapping.cat);
    expectRecord(discriminatorMapping.dog);
    expect(discriminatorMapping.cat).toMatchObject({
      properties: {
        meow: {
          type: 'string',
        },
      },
    });
    expect(discriminatorMapping.dog).toMatchObject({
      properties: {
        bark: {
          type: 'string',
        },
      },
    });
  });

  it('should accept inline discriminated request body', async () => {
    const query = /* GraphQL */ `
      mutation CreateCat($input: createThing_request_Input) {
        createThing(input: $input) {
          id
          type
          name
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
      variableValues: {
        input: {
          CreateCatInput_Input: {
            type: 'cat',
            name: 'Luna',
            meow: 'loud',
          },
        },
      },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      createThing: {
        id: '1',
        type: 'cat',
        name: 'Luna',
      },
    });
    expect(receivedBodies).toContainEqual({
      type: 'cat',
      name: 'Luna',
      meow: 'loud',
    });
  });
});

describe('Inline Discriminator Mapping (callback)', () => {
  it('should resolve inline discriminator mapping in callback request bodies', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/discriminator-inline-callback.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
    });
    const schemaWithDirectives = printSchemaWithDirectives(schema);
    expect(schemaWithDirectives).toContain('type Subscription');
    expect(schemaWithDirectives).toContain(
      '@discriminator(subgraph: "test", field: "type", mapping: [["cat", "Cat"], ["dog", "Dog"]])',
    );
  });
});

describe('Inline Discriminator Mapping (nested property)', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/discriminator-inline-nested.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      async fetch(url) {
        if (url === 'envelope') {
          return Response.json({
            pet: {
              id: '1',
              type: 'dog',
              name: 'Milo',
            },
          });
        }
        return new Response(null, {
          status: 404,
        });
      },
    });
  });

  it('should resolve inline discriminator nested under object properties', async () => {
    const query = /* GraphQL */ `
      query {
        envelope {
          pet {
            __typename
            ... on Cat {
              id
              type
              name
            }
            ... on Dog {
              id
              type
              name
            }
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
    });
    expect(result).toEqual({
      data: {
        envelope: {
          pet: {
            __typename: 'Dog',
            id: '1',
            type: 'dog',
            name: 'Milo',
          },
        },
      },
    });
  });
});
