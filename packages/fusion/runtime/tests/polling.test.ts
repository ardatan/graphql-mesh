import { GraphQLSchema, parse } from 'graphql';
import { createSchema } from 'graphql-yoga';
import { getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { normalizedExecutor } from '@graphql-tools/executor';
import { isAsyncIterable } from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { UnifiedGraphManager } from '../src/unifiedGraphManager';

describe('Polling', () => {
  it('polls the schema in a certain interval', async () => {
    jest.useFakeTimers();
    const pollingInterval = 35_000;
    let schema: GraphQLSchema;
    const unifiedGraphFetcher = () => {
      const time = new Date().toISOString();
      schema = createSchema({
        typeDefs: /* GraphQL */ `
          """
          Fetched on ${time}
          """
          type Query {
            time: String
          }
        `,
        resolvers: {
          Query: {
            time() {
              return time;
            },
          },
        },
      });
      return getUnifiedGraphGracefully([
        {
          name: 'Test',
          schema,
        },
      ]);
    };
    const disposeFn = jest.fn();
    await using manager = new UnifiedGraphManager({
      getUnifiedGraph: unifiedGraphFetcher,
      pollingInterval: pollingInterval,
      batch: false,
      transports() {
        return {
          getSubgraphExecutor() {
            const executor: DisposableExecutor = createDefaultExecutor(schema);
            executor[DisposableSymbols.asyncDispose] = disposeFn;
            return executor;
          },
        };
      },
    });
    async function getFetchedTimeOnComment() {
      const schema = await manager.getUnifiedGraph();
      const queryType = schema.getQueryType();
      const lastFetchedDateStr = queryType.description.match(/Fetched on (.*)/)[1];
      const lastFetchedDate = new Date(lastFetchedDateStr);
      return lastFetchedDate;
    }
    async function getFetchedTimeFromResolvers() {
      const schema = await manager.getUnifiedGraph();
      const result = await normalizedExecutor({
        schema,
        document: parse(/* GraphQL */ `
          query {
            time
          }
        `),
      });
      if (isAsyncIterable(result)) {
        throw new Error('Unexpected async iterable');
      }
      return new Date(result.data.time);
    }
    async function compareTimes() {
      const timeFromComment = await getFetchedTimeOnComment();
      const timeFromResolvers = await getFetchedTimeFromResolvers();
      expect(timeFromComment).toEqual(timeFromResolvers);
    }
    await compareTimes();
    const firstDate = await getFetchedTimeOnComment();
    jest.advanceTimersByTime(pollingInterval);
    await compareTimes();
    const secondDate = await getFetchedTimeOnComment();
    const diffBetweenFirstAndSecond = secondDate.getTime() - firstDate.getTime();
    expect(diffBetweenFirstAndSecond).toBeGreaterThanOrEqual(pollingInterval);
    jest.advanceTimersByTime(pollingInterval);
    await compareTimes();
    const thirdDate = await getFetchedTimeOnComment();
    const diffBetweenSecondAndThird = thirdDate.getTime() - secondDate.getTime();
    expect(diffBetweenSecondAndThird).toBeGreaterThanOrEqual(pollingInterval);
    const diffBetweenFirstAndThird = thirdDate.getTime() - firstDate.getTime();
    expect(diffBetweenFirstAndThird).toBeGreaterThanOrEqual(pollingInterval * 2);

    // Check if transport executor is disposed per schema change
    expect(disposeFn).toHaveBeenCalledTimes(2);

    await manager[DisposableSymbols.asyncDispose]();
    // Check if transport executor is disposed on global shutdown
    expect(disposeFn).toHaveBeenCalledTimes(3);
  });
  it('continues polling after failing initial fetch', async () => {
    jest.useFakeTimers();
    const pollingInterval = 35_000;
    let schema: GraphQLSchema;
    let shouldFail = true;
    const unifiedGraphFetcher = jest.fn(() => {
      if (shouldFail) {
        throw new Error('Failed to fetch schema');
      }
      const time = new Date().toISOString();
      schema = createSchema({
        typeDefs: /* GraphQL */ `
          """
          Fetched on ${time}
          """
          type Query {
            time: String
          }
        `,
        resolvers: {
          Query: {
            time() {
              return time;
            },
          },
        },
      });
      return getUnifiedGraphGracefully([
        {
          name: 'Test',
          schema,
        },
      ]);
    });
    await using manager = new UnifiedGraphManager({
      getUnifiedGraph: unifiedGraphFetcher,
      pollingInterval: pollingInterval,
      batch: false,
      transports() {
        return {
          getSubgraphExecutor() {
            return createDefaultExecutor(schema);
          },
        };
      },
    });
    async function getFetchedTimeOnComment() {
      const schema = await manager.getUnifiedGraph();
      const queryType = schema.getQueryType();
      const lastFetchedDateStr = queryType.description.match(/Fetched on (.*)/)[1];
      const lastFetchedDate = new Date(lastFetchedDateStr);
      return lastFetchedDate;
    }
    async function getFetchedTimeFromResolvers() {
      const schema = await manager.getUnifiedGraph();
      const result = await normalizedExecutor({
        schema,
        document: parse(/* GraphQL */ `
          query {
            time
          }
        `),
      });
      if (isAsyncIterable(result)) {
        throw new Error('Unexpected async iterable');
      }
      return new Date(result.data.time);
    }
    async function compareTimes() {
      const timeFromComment = await getFetchedTimeOnComment();
      const timeFromResolvers = await getFetchedTimeFromResolvers();
      expect(timeFromComment).toEqual(timeFromResolvers);
    }
    await expect(async () => manager.getUnifiedGraph()).rejects.toThrow();
    shouldFail = false;
    jest.advanceTimersByTime(pollingInterval);
    await compareTimes();
    shouldFail = true;
    jest.advanceTimersByTime(pollingInterval);
    // Should not fail again once it has succeeded
    await compareTimes();
    jest.advanceTimersByTime(pollingInterval);
    // Should keep polling even if it fails in somewhere
    expect(unifiedGraphFetcher).toHaveBeenCalledTimes(4);
  });
});
