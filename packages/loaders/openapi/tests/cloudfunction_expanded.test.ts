import { GraphQLSchema, parse, validate } from 'graphql';
import { join } from 'path';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('Cloudfunction', () => {
  let createdSchema: GraphQLSchema;
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('test', {
      oasFilePath: join(__dirname, '../../../handlers/openapi/test/fixtures/cloudfunction_expanded.json'),
      operationHeaders: {
        Authorization: 'Basic {args.usernamePassword|base64}',
      },
      ignoreErrorResponses: true, // Because Error type is invalid in the OAS file
    });
  });
  it('should generate correct schema', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot('cloudfunction-schema');
  });
  it('should validate the following query', () => {
    const query = /* GraphQL */ `
      mutation {
        post_test_action_2(input: { age: 27 }, usernamePassword: "test:data") {
          payload
          age
        }
      }
    `;
    const document = parse(query);
    const errors = validate(createdSchema, document);
    expect(errors).toEqual([]);
  });
});
