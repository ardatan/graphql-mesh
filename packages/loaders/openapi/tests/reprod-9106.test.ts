import type { GraphQLSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '@omnigraph/openapi';

describe('Reproduction #9106', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/reprod-9106.yml',
      cwd: __dirname,
      ignoreErrorResponses: true,
      async fetch(url) {
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
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('reprod-9106');
  });
});
