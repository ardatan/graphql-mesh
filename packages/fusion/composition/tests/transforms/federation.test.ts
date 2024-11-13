import { createSchema } from 'graphql-yoga';
import { createFederationTransform } from '@graphql-mesh/fusion-composition';
import { composeAndGetExecutor } from './utils';

describe('Federation', () => {
  it('works', async () => {
    const ASchema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          fooFromA(idForA: ID!): Foo
        }

        type Foo {
          id: ID!
          fieldFromA: String!
        }
      `,
      resolvers: {
        Query: {
          fooFromA: (_, { idForA }) => ({ id: idForA, fieldFromA: 'A' }),
        },
      },
    });
    const BSchema = createSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          fooFromB(idForB: ID!): Foo
        }

        type Foo {
          id: ID!
          fieldFromB: String!
        }
      `,
      resolvers: {
        Query: {
          fooFromB: (_, { idForB }) => ({ id: idForB, fieldFromB: 'B' }),
        },
      },
    });
    const executor = composeAndGetExecutor([
      {
        name: 'A',
        schema: ASchema,
        transforms: [
          createFederationTransform({
            Foo: {
              key: {
                fields: 'id',
                resolveReference: {
                  fieldName: 'fooFromA',
                  keyArg: 'idForA',
                },
              },
            },
          }),
        ],
      },
      {
        name: 'B',
        schema: BSchema,
        transforms: [
          createFederationTransform({
            Foo: {
              key: {
                fields: 'id',
                resolveReference: {
                  fieldName: 'fooFromB',
                  keyArg: 'idForB',
                },
              },
            },
          }),
        ],
      },
    ]);
    const result = await executor({
      query: /* GraphQL */ `
        fragment Foo on Foo {
          id
          fieldFromA
          fieldFromB
        }
        query {
          fooFromA(idForA: "1") {
            ...Foo
          }
          fooFromB(idForB: "2") {
            ...Foo
          }
        }
      `,
    });
    expect(result).toEqual({
      fooFromA: {
        id: '1',
        fieldFromA: 'A',
        fieldFromB: 'B',
      },
      fooFromB: {
        id: '2',
        fieldFromA: 'A',
        fieldFromB: 'B',
      },
    });
  });
});
