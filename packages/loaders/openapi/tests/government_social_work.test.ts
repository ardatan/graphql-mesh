import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { GraphQLSchema, parse, validate } from 'graphql';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

let createdSchema: GraphQLSchema;

describe('openAPI loader: government_social_work', () => {
  /**
   * Set up the schema first
   */
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api', {
      fetch,
      source: './fixtures/government_social_work.json',
      cwd: __dirname,
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  it('All query endpoints present', async () => {
    const gqlTypes = Object.keys(createdSchema.getQueryType().getFields()).length;
    expect(gqlTypes).toEqual(23);
  });

  it('All mutation endpoints present', async () => {
    const gqlTypes = Object.keys(createdSchema.getMutationType().getFields()).length;
    expect(gqlTypes).toEqual(20);
  });

  it('Get resource', async () => {
    const query = /* GraphQL */ `
      {
        getAssessmentTypes(
          Content_Type: ""
          Accept_Language: ""
          User_Agent: ""
          Api_Version: "1.1.0"
          offset: "40"
          limit: "test"
        ) {
          ... on getAssessmentTypes_200_response {
            data {
              assessmentTypeId
            }
          }
        }
      }
    `;

    const ast = parse(query);
    const errors = validate(createdSchema, ast);
    expect(errors).toEqual([]);
  });
});
