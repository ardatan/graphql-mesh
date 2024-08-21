import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('Spotify', () => {
  let schema: GraphQLSchema;

  beforeAll(async () => {
    schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/spotify.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      fetch: async url =>
        Response.json({
          albums: {
            items: [
              {
                name: url,
              },
            ],
          },
        }),
    });
  });

  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('spotify-schema');
  });

  it('should sent comma separated args correctly', async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          search(q: "test", type: [album, artist]) {
            albums {
              items {
                name
              }
            }
          }
        }
      `),
    });

    const expectedURL = 'https://api.spotify.com/v1/search?q=test&type=album%2Cartist&limit=20';
    expect(result).toEqual({
      data: {
        search: {
          albums: {
            items: [
              {
                name: expectedURL,
              },
            ],
          },
        },
      },
    });
  });
});
