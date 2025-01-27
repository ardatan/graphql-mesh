import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch, Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('Discriminator Mapping', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/discriminator-mapping.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      fetch(url) {
        if (url.startsWith('file:')) {
          return fetch(url);
        }
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
