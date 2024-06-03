import { buildSchema, ExecutionResult } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';
import { useUnifiedGraph } from '../src/useUnifiedGraph';

describe('Polling', () => {
  it('polls the schema in a certain interval', async () => {
    jest.useFakeTimers();
    interface QueryResult {
      __type: {
        description: string;
      };
    }
    const pollingInterval = 35_000;
    const unifiedGraphFetcher = () =>
      composeSubgraphs([
        {
          name: 'Test',
          schema: buildSchema(/* GraphQL */ `
          """
          Fetched on ${new Date().toISOString()}
          """
          type Query {
            test: String
          }
        `),
        },
      ]);
    const yoga = createYoga({
      plugins: [
        useUnifiedGraph({
          getUnifiedGraph: unifiedGraphFetcher,
          polling: pollingInterval,
        }),
      ],
    });
    async function getFetchedTime() {
      const result = await yoga.fetch('/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              __type(name: "Query") {
                description
              }
            }
          `,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const resJson: ExecutionResult<QueryResult> = await result.json();
      const lastFetchedDateStr = resJson.data.__type.description.match(/Fetched on (.*)/)[1];
      const lastFetchedDate = new Date(lastFetchedDateStr);
      return lastFetchedDate;
    }
    const firstDate = await getFetchedTime();
    jest.advanceTimersByTime(pollingInterval);
    const secondDate = await getFetchedTime();
    expect(secondDate.getTime() - firstDate.getTime()).toBeGreaterThanOrEqual(pollingInterval);
    jest.advanceTimersByTime(pollingInterval);
    const thirdDate = await getFetchedTime();
    expect(thirdDate.getTime() - secondDate.getTime()).toBeGreaterThanOrEqual(pollingInterval);
    expect(thirdDate.getTime() - firstDate.getTime()).toBeGreaterThanOrEqual(pollingInterval * 2);
  });
});
