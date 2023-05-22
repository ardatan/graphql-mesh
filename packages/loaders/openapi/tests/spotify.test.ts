import { join } from 'path';
import { GraphQLSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

describe('Spotify', () => {
  let createdSchema: GraphQLSchema;

  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: join(__dirname, './fixtures/spotify.yml'),
      ignoreErrorResponses: true,
      // It is not possible to provide a union type with File scalar
    });
  });

  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('spotify-schema');
  });
});
