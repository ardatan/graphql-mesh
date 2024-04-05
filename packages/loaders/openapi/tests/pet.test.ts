import { createRouter, Response } from 'fets';
import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Pet', () => {
  let schema: GraphQLSchema;
  beforeAll(async () => {
    const router = createRouter().route({
      path: '/pets/:id',
      method: 'GET',
      handler: req => {
        if (req.params.id === '1') {
          return Response.json({
            name: 'Sam',
            petType: 'Dog',
          });
        }
        if (req.params.id === '2') {
          return Response.json({
            name: 'Tom',
            petType: 'Cat',
          });
        }
        return new Response('Not Found', { status: 404 });
      },
    });
    schema = await loadGraphQLSchemaFromOpenAPI('Pet', {
      endpoint: 'http://example.com',
      source: `./fixtures/pet.yml`,
      cwd: __dirname,
      fetch: async (url, init) => router.fetch(url, init),
    });
  });
  it('should generate the correct schema', async () => {
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('schema');
  });
  it('should resolve Cat', async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          pets_by_id(id: "2") {
            __typename
            ... on Cat {
              name
              petType
            }
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        pets_by_id: {
          __typename: 'Cat',
          name: 'Tom',
          petType: 'Cat',
        },
      },
    });
  });
});
