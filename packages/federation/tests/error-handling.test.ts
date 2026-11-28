import { buildSubgraphSchema } from '@apollo/subgraph';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { isAsyncIterable } from '@graphql-tools/utils';
import { composeLocalSchemasWithApollo } from './helpers';
import { GraphQLSchema, parse } from 'graphql';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('Error handling', () => {
  let aResult: any;
  let bResult: any;
  const subgraphA = buildSubgraphSchema([{
    typeDefs: parse(/* GraphQL */ `
      type Query {
        foo: Foo
      }

      type Foo @key(fields: "id") {
        id: ID!
        bar: String
      }
    `),
    resolvers: {
      Query: {
        foo() {
          return aResult;
        },
      },
      Foo: {
        __resolveReference(root) {
          return root;
        },
        bar() {
          return 'Bar';
        },
      },
    },
  }]);
  const subgraphB = buildSubgraphSchema([{
    typeDefs: parse(/* GraphQL */ `
      type Query {
        foo: Foo
      }

      extend type Foo @key(fields: "id") {
        id: ID!
        baz: String
      }
    `),
    resolvers: {
      Query: {
        foo() {
          return bResult;
        },
      },
      Foo: {
        __resolveReference(root) {
          return root;
        },
        baz() {
          return 'Baz';
        },
      },
    },
  }]);
  let supergraph: GraphQLSchema;
  beforeAll(async () => {
    const supergraphSdl = await composeLocalSchemasWithApollo([
      {
        name: 'A',
        schema: subgraphA,
      },
      {
        name: 'B',
        schema: subgraphB,
      },
    ]);
    supergraph = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschemaConfig) {
        if (subschemaConfig.name === 'A') {
          subschemaConfig.executor = createDefaultExecutor(subgraphA);
        } else if (subschemaConfig.name === 'B') {
          subschemaConfig.executor = createDefaultExecutor(subgraphB);
        } else {
          throw new Error(`Unknown subgraph: ${subschemaConfig.name}`);
        }
      },
    });
  });
  it('chooses the successful result from shared root fields', async () => {
    aResult = new Error('A failed');
    bResult = { id: '1' };
    const result = await normalizedExecutor({
      schema: supergraph,
      document: parse(/* GraphQL */ `
        query {
          foo {
            id
            bar
            baz
          }
        }
      `),
    });
    if (isAsyncIterable(result)) {
      throw new Error('Expected result to be an ExecutionResult');
    }
    expect(result).toEqual({
      data: {
        foo: {
          id: '1',
          bar: null,
          baz: 'Baz',
        },
      },
      errors: [
        expect.objectContaining({
          message: 'A failed',
          path: ['foo'],
        }),
      ],
    });
  });
  it('merges errors from shared root fields', async () => {
    aResult = new Error('A failed');
    bResult = new Error('B failed');
    const result = await normalizedExecutor({
      schema: supergraph,
      document: parse(/* GraphQL */ `
        query {
          foo {
            id
            bar
            baz
          }
        }
      `),
    });
    if (isAsyncIterable(result)) {
      throw new Error('Expected result to be an ExecutionResult');
    }
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'A failed',
      }),
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        message: 'B failed',
      }),
    );
  });
});
