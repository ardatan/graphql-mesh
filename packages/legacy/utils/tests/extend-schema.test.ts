import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  extendSchema as graphqlExtendSchema,
  parse,
} from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import { extendSchemaPreservingExtensions } from '../src/extend-schema';

describe('extendSchemaPreservingExtensions', () => {
  it('keeps schema.extensions.directives after extend (graphql@16 drops them)', () => {
    const query = new GraphQLObjectType({
      name: 'Query',
      fields: { a: { type: GraphQLString } },
    });
    const schema = new GraphQLSchema({
      query,
      extensions: {
        directives: {
          source: [{ name: 'Example', http: { baseURL: 'https://example.com' } }],
          link: [{ url: 'https://specs.apollo.dev/connect/v0.4', import: ['@connect', '@source'] }],
        },
      },
    });

    const stock = graphqlExtendSchema(schema, parse(`extend type Query { b: String }`));
    // Document the graphql-js behavior this helper papers over on v16.
    if (Object.keys(stock.extensions || {}).length === 0) {
      expect(getDirectiveExtensions(stock)).toEqual({});
    }

    const preserved = extendSchemaPreservingExtensions(
      schema,
      parse(`extend type Query { b: String }`),
    );
    expect(getDirectiveExtensions(preserved)).toEqual({
      source: [{ name: 'Example', http: { baseURL: 'https://example.com' } }],
      link: [{ url: 'https://specs.apollo.dev/connect/v0.4', import: ['@connect', '@source'] }],
    });
    expect(preserved.getQueryType()?.getFields().b).toBeDefined();
  });
});
