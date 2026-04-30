import { execute, parse } from 'graphql';
import type { GraphQLSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

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
