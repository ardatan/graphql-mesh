import { buildSchema } from 'graphql';
import { createSchema } from 'graphql-yoga';
import { createFederationTransform, type SubgraphConfig } from '@graphql-mesh/fusion-composition';
import { TransformValidationError } from '../../src/transforms/utils';
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

  describe('resolveReference validation', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        fooById(id: ID!): Foo
      }
      type Foo {
        id: ID!
        name: String!
      }
    `);
    const subgraphConfig: SubgraphConfig = { name: 'test', schema };

    it('throws TransformValidationError when fieldName is missing', () => {
      const transform = createFederationTransform({
        Foo: {
          key: {
            fields: 'id',
            resolveReference: {
              fieldName: '',
              keyArg: 'id',
            },
          },
        },
      });
      expect(() => transform(schema, subgraphConfig)).toThrow(TransformValidationError);
      expect(() => transform(schema, subgraphConfig)).toThrow(
        /Missing fieldName in resolveReference config for @key directive on Foo type/,
      );
    });

    it('throws TransformValidationError when fieldName does not exist in root type', () => {
      const transform = createFederationTransform({
        Foo: {
          key: {
            fields: 'id',
            resolveReference: {
              fieldName: 'nonExistentField',
              keyArg: 'id',
            },
          },
        },
      });
      expect(() => transform(schema, subgraphConfig)).toThrow(TransformValidationError);
      expect(() => transform(schema, subgraphConfig)).toThrow(
        /Field "nonExistentField" not found in root type "Query" for @key directive on Foo type/,
      );
    });

    it('includes suggestion when fieldName is close to an existing field', () => {
      const transform = createFederationTransform({
        Foo: {
          key: {
            fields: 'id',
            resolveReference: {
              fieldName: 'fooByI',
              keyArg: 'id',
            },
          },
        },
      });
      expect(() => transform(schema, subgraphConfig)).toThrow(TransformValidationError);
      expect(() => transform(schema, subgraphConfig)).toThrow(/Did you mean "fooById"/);
    });

    it('throws TransformValidationError when operation type is invalid', () => {
      const transform = createFederationTransform({
        Foo: {
          key: {
            fields: 'id',
            resolveReference: {
              // @ts-expect-error testing invalid operation type
              operation: 'invalid',
              fieldName: 'fooById',
              keyArg: 'id',
            },
          },
        },
      });
      expect(() => transform(schema, subgraphConfig)).toThrow(TransformValidationError);
      expect(() => transform(schema, subgraphConfig)).toThrow(
        /Invalid operation type "invalid" in resolveReference config/,
      );
    });
  });
});
