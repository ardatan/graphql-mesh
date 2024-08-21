import { createRouter, Response } from 'fets';
import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('Discriminator with invalid key in the mapping', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    interface Pet {
      name: string;
      petType: string;
    }

    interface Cat extends Pet {
      color: string;
    }

    interface Dog extends Pet {
      age: string;
    }
    const pets: { [id: string]: Cat | Dog } = {
      '1': {
        name: 'Fluffy',
        petType: 'pet-cat',
        color: 'climber',
      },
      '2': {
        name: 'Buddy',
        petType: 'pet-dog',
        age: '23',
      },
    };
    const router = createRouter()
      .route({
        path: '/pets/:id',
        method: 'GET',
        handler(req) {
          const pet = pets[req.params.id];
          if (pet) {
            return Response.json(pet);
          }
          return new Response('Pet not found', {
            status: 404,
          });
        },
      })
      .route({
        path: '/dogs/:id',
        method: 'GET',
        handler(req) {
          const pet = pets[req.params.id];
          if (pet && pet.petType === 'Dog') {
            return Response.json(pet);
          }
          return new Response('Dog not found', {
            status: 404,
          });
        },
      })
      .route({
        path: '/cats/:id',
        method: 'GET',
        handler(req) {
          const pet = pets[req.params.id];
          if (pet && pet.petType === 'Cat') {
            return Response.json(pet);
          }
          return new Response('Cat not found', {
            status: 404,
          });
        },
      });

    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/discriminator-invalid-keys.yml',
      endpoint: 'http://localhost',
      cwd: __dirname,
      ignoreErrorResponses: true,
      // @ts-ignore
      fetch: router.fetch,
    });
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('discriminator-invalid-key');
  });
  it('should handle discriminator mapping', async () => {
    const query = /* GraphQL */ `
      query Pet {
        cat: pets_by_id(id: "1") {
          __typename
          name
          petType
          ... on Cat {
            color
          }
        }
        dog: pets_by_id(id: "2") {
          __typename
          name
          petType
          ... on Dog {
            age
          }
        }
      }
    `;
    const result = await execute({
      schema: createdSchema,
      document: parse(query),
      variableValues: {
        petsByIdId: '1',
      },
    });
    expect(result).toEqual({
      data: {
        cat: {
          __typename: 'Cat',
          name: 'Fluffy',
          petType: 'pet-cat',
          color: 'climber',
        },
        dog: {
          __typename: 'Dog',
          name: 'Buddy',
          petType: 'pet-dog',
          age: '23',
        },
      },
    });
  });
});
