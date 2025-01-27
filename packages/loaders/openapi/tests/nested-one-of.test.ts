import { execute, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch, Response } from '@whatwg-node/fetch';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('Algolia schema with nested one Of', () => {
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('algolia-nested-one-of', {
      source: `./fixtures/algolia-subset-nested-one-of.yml`,
      cwd: __dirname,
      fetch,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('schema');
  });
  it('should handle nested oneOfs correctly during execution', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('algolia-nested-one-of', {
      source: `./fixtures/algolia-subset-nested-one-of.yml`,
      cwd: __dirname,
      fetch(url, opts) {
        if (url.startsWith('file:')) {
          return fetch(url, opts);
        }
        return Response.json({
          consequence: {
            params: {
              facetFilters: [[['foo'], 'bar'], 'baz'],
            },
          },
        });
      },
    });
    const query = /* GraphQL */ `
      query {
        getRule {
          consequence {
            params {
              facetFilters
            }
          }
        }
      }
    `;
    const result = await execute({
      schema,
      document: parse(query),
    });
    expect(result).toMatchObject({
      data: {
        getRule: {
          consequence: {
            params: {
              facetFilters: ['foo', 'bar', 'baz'],
            },
          },
        },
      },
    });
  });
});
