import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createRouter, Response } from '@whatwg-node/router';
import { execute, GraphQLSchema, parse } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('additionalProperties', () => {
  let schema: GraphQLSchema;

  const router = createRouter();
  router.get('/test', () => {
    return new Response(
      JSON.stringify({
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
    );
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
    const result = await execute({
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
