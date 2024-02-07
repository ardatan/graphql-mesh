/* eslint-disable import/no-extraneous-dependencies */
import { createSchema, createYoga } from 'graphql-yoga';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';
import { createExecutablePlanForOperation } from '@graphql-mesh/fusion-execution';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { useFusiongraph } from '../src';

jest.mock('@graphql-mesh/fusion-execution', () => {
  const actual = jest.requireActual('@graphql-mesh/fusion-execution');
  return {
    ...actual,
    createExecutablePlanForOperation: jest.fn(actual.createExecutablePlanForOperation),
  };
});

describe('useFusiongraph', () => {
  const aSchema = createSchema({
    typeDefs: `
      type Query {
        a: String
      }
    `,
    resolvers: {
      Query: {
        a: () => 'a',
      },
    },
  });
  const bSchema = createSchema({
    typeDefs: `
      type Query {
        b: String
      }
    `,
    resolvers: {
      Query: {
        b: () => 'b',
      },
    },
  });
  const yoga = createYoga({
    plugins: [
      useFusiongraph({
        getFusiongraph: () =>
          composeSubgraphs([
            {
              name: 'a',
              schema: aSchema,
            },
            {
              name: 'b',
              schema: bSchema,
            },
          ]),
        transports() {
          return {
            getSubgraphExecutor({ subgraphName }) {
              switch (subgraphName) {
                case 'a':
                  return createDefaultExecutor(aSchema);
                case 'b':
                  return createDefaultExecutor(bSchema);
              }
              throw new Error(`Unknown subgraph: ${subgraphName}`);
            },
          };
        },
      }),
    ],
    maskedErrors: false,
  });
  it('works', async () => {
    await makeQuery();
  });
  it('memoizes plan', async () => {
    await makeQuery();
    await makeQuery();
    expect(createExecutablePlanForOperation).toHaveBeenCalledTimes(1);
  });
  async function makeQuery() {
    const res = await yoga.fetch('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            a
            b
          }
        `,
      }),
    });
    const resJson = await res.json();
    expect(resJson).toEqual({
      data: {
        a: 'a',
        b: 'b',
      },
    });
  }
});
