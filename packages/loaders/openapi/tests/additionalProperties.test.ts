import { createRouter, Response } from 'fets';
import { GraphQLSchema, parse } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { isAsyncIterable, printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('additionalProperties', () => {
  let schema: GraphQLSchema;

  const router = createRouter().route({
    method: 'GET',
    path: '/test',
    handler: () =>
      Response.json({
        id: 1,
        foo: {
          bar: 'baz',
        },
        qux: {
          quux: 'randomvalue',
          quuz: {
            corge: 'grault',
          },
          garply: {
            corge: 'fred',
          },
        },
      }),
  });

  beforeAll(async () => {
    schema = await loadGraphQLSchemaFromOpenAPI('additionalPropertiesTest', {
      source: './fixtures/additionalProperties.json',
      endpoint: 'http://localhost:3000',
      cwd: __dirname,
      fetch: router.fetch as any,
    });
  });
  it('should generate the schema correctly', async () => {
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('schema');
  });
  it('should return values correctly', async () => {
    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          test {
            id
            foo {
              bar
            }
            qux {
              quux
              additionalProperties {
                key
                value {
                  corge
                }
              }
            }
          }
        }
      `),
    });
    expect(result).toMatchObject({
      data: {
        test: {
          foo: {
            bar: 'baz',
          },
          id: '1',
          qux: {
            additionalProperties: [
              {
                key: 'quuz',
                value: {
                  corge: 'grault',
                },
              },
              {
                key: 'garply',
                value: {
                  corge: 'fred',
                },
              },
            ],
            quux: 'randomvalue',
          },
        },
      },
    });
  });
});
