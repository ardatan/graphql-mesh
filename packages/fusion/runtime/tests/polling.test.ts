import { buildSchema } from 'graphql';
import { composeSubgraphs, getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { UnifiedGraphManager } from '../src/unifiedGraphManager';

describe('Polling', () => {
  it('polls the schema in a certain interval', async () => {
    jest.useFakeTimers();
    const pollingInterval = 35_000;
    const unifiedGraphFetcher = () =>
      getUnifiedGraphGracefully([
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
    await using manager = new UnifiedGraphManager({
      getUnifiedGraph: unifiedGraphFetcher,
      polling: pollingInterval,
    });
    async function getFetchedTime() {
      const schema = await manager.getUnifiedGraph();
      const queryType = schema.getQueryType();
      const lastFetchedDateStr = queryType.description.match(/Fetched on (.*)/)[1];
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
