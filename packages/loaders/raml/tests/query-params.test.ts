import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response, URL } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromRAML } from '../src/loadGraphQLSchemaFromRAML';

describe('Query Paramters', () => {
  let schema: GraphQLSchema;
  beforeAll(async () => {
    schema = await loadGraphQLSchemaFromRAML('query-params', {
      source: './fixtures/query-params.raml',
      cwd: __dirname,
      async fetch(url: string) {
        const parsedUrl = new URL(url);
        if (parsedUrl.searchParams.get('isApproved') === 'true') {
          return Response.json([
            {
              id: '1',
              name: 'Approved Product',
            },
          ]);
        } else {
          return Response.json([
            {
              id: '2',
              name: 'Not Approved Product',
            },
          ]);
        }
      },
    });
  });
  it('generates correct schema', () => {
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
  it('respects default values', async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          listOfProducts {
            id
            name
          }
        }
      `),
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toEqual({
      listOfProducts: [
        {
          id: '1',
          name: 'Approved Product',
        },
      ],
    });
  });
  it('respects arguments with values', async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          falseOne: listOfProducts(isApproved: false) {
            id
            name
          }
          trueOne: listOfProducts(isApproved: true) {
            id
            name
          }
        }
      `),
    });
    expect(result.errors).toBeFalsy();
    expect(result.data).toEqual({
      trueOne: [
        {
          id: '1',
          name: 'Approved Product',
        },
      ],
      falseOne: [
        {
          id: '2',
          name: 'Not Approved Product',
        },
      ],
    });
  });
});
