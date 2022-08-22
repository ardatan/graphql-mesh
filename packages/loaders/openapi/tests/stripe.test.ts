import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch } from '@whatwg-node/fetch';
import { GraphQLSchema } from 'graphql';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

let createdSchema: GraphQLSchema;

describe('OpenAPI loader: Stripe', () => {
  /**
   * Set up the schema first
   */
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('stripe_api', {
      fetch,
      oasFilePath: '../../../handlers/openapi/test/fixtures/stripe.json',
      cwd: __dirname,
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
  });

  it('All Stripe query endpoints present', () => {
    const gqlTypes = Object.keys(createdSchema.getQueryType().getFields()).length;

    expect(gqlTypes).toEqual(162);
  });
});
