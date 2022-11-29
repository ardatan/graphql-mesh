import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { createServerAdapter } from '@whatwg-node/server';
import { execute, parse } from 'graphql';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

const serverAdapter = createServerAdapter(request => {
  if (request.url.endsWith('/test')) {
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
  }
});

describe('additionalProperties', () => {
  it('should generate the schema correctly', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('additionalPropertiesTest', {
      source: './fixtures/additionalProperties.json',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('schema');
  });
  it('should return values correctly', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('additionalPropertiesTest', {
      source: './fixtures/additionalProperties.json',
      baseUrl: 'http://localhost:3000',
      cwd: __dirname,
      fetch: serverAdapter.fetch as any,
    });
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
    expect(result).toMatchInlineSnapshot(`
      {
        "data": {
          "test": {
            "foo": {
              "bar": "baz",
            },
            "id": "1",
            "qux": {
              "additionalProperties": [
                {
                  "key": "quuz",
                  "value": {
                    "corge": "grault",
                  },
                },
                {
                  "key": "garply",
                  "value": {
                    "corge": "fred",
                  },
                },
              ],
              "quux": "randomvalue",
            },
          },
        },
      }
    `);
  });
});
