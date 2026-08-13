import { buildSchema, GraphQLObjectType, printSchema } from 'graphql';
import { createPrefixTransform, getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('prefix force (integration)', () => {
  it('keeps DateTime unprefixed by default and prefixes it when forced', () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        scalar DateTime

        type Query {
          now: DateTime
        }
      `,
    });

    const withoutForce = buildSchema(
      getUnifiedGraphGracefully([
        {
          name: 'TEST',
          schema,
          transforms: [createPrefixTransform({ value: 'T_' })],
        },
      ]),
      { assumeValid: true, assumeValidSDL: true },
    );
    expect(withoutForce.getType('DateTime')).toBeDefined();
    expect(withoutForce.getType('T_DateTime')).toBeUndefined();
    expect(printSchema(withoutForce)).toContain('scalar DateTime');

    const withForce = buildSchema(
      getUnifiedGraphGracefully([
        {
          name: 'TEST',
          schema,
          transforms: [createPrefixTransform({ value: 'T_', force: ['DateTime'] })],
        },
      ]),
      { assumeValid: true, assumeValidSDL: true },
    );
    expect(withForce.getType('DateTime')).toBeUndefined();
    expect(withForce.getType('T_DateTime')).toBeDefined();
    expect((withForce.getType('Query') as GraphQLObjectType).getFields().now.type.toString()).toBe(
      'T_DateTime',
    );
    expect(printSchema(withForce)).toContain('scalar T_DateTime');
  });
});
