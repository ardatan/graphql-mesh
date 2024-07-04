import { buildSchema, GraphQLSchema, parse } from 'graphql';
import { createSchema } from 'graphql-yoga';
import { composeSubgraphs, getUnifiedGraphGracefully } from '@graphql-mesh/fusion-composition';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { normalizedExecutor } from '@graphql-tools/executor';
import { isAsyncIterable } from '@graphql-tools/utils';
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
    const manager = new UnifiedGraphManager({
      getUnifiedGraph: unifiedGraphFetcher,
      polling: pollingInterval,
      transports() {
        return {
          getSubgraphExecutor() {
            const executor: DisposableExecutor = createDefaultExecutor(schema);
            executor[Symbol.asyncDispose] = disposeFn;
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

    await manager[Symbol.asyncDispose]();
    // Check if transport executor is disposed on global shutdown
    expect(disposeFn).toHaveBeenCalledTimes(3);
  });

  it('should invoke onSchemaChange hooks when schema changes', done => {
    let onSchemaChangeCalls = 0;
    const serve = createServeRuntime({
      polling: 500,
      supergraph() {
        if (onSchemaChangeCalls > 0) {
          // change schema after onSchemaChange was invoked
          return /* GraphQL */ `
            type Query {
              hello: Int!
            }
          `;
        }

        return /* GraphQL */ `
          type Query {
            world: String!
          }
        `;
      },
      plugins: () => [
        {
          onSchemaChange() {
            if (onSchemaChangeCalls > 0) {
              // schema changed for the second time
              done();
            }
            onSchemaChangeCalls++;
          },
        },
      ],
    });

    // trigger mesh
    serve.fetch('http://mesh/graphql?query={__typename}');
  });
});
