import { buildSubgraphSchema } from '@apollo/subgraph';
import { normalizedExecutor } from '@graphql-tools/executor';
import { ExecutionRequest } from '@graphql-tools/utils';
import { assertAsyncIterable } from './helpers';
import { ExecutionResult, GraphQLError, parse } from 'graphql';
import { getStitchedSchemaFromLocalSchemas } from './getStitchedSchemaFromLocalSchemas';

describe('Shared Root Fields', () => {
  it('Aliased shared root fields issue #6613', async () => {
    const query = /* GraphQL */ `
      query {
        testNestedField {
          subgraph1 {
            id
            email
            sub1
          }
          testUserAlias: subgraph2 {
            id
            email
            sub2
          }
        }
      }
    `;

    const expectedResult = {
      data: {
        testNestedField: {
          subgraph1: {
            id: 'user1',
            email: 'user1@example.com',
            sub1: true,
          },
          testUserAlias: {
            id: 'user2',
            email: 'user2@example.com',
            sub2: true,
          },
        },
      },
    };

    const subgraph1 = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        type Query {
          testNestedField: TestNestedField
        }

        type TestNestedField {
          subgraph1: TestUser1!
        }

        type TestUser1 {
          id: String!
          email: String!
          sub1: Boolean!
        }
      `),
      resolvers: {
        Query: {
          testNestedField: () => ({
            subgraph1: () => ({
              id: 'user1',
              email: 'user1@example.com',
              sub1: true,
            }),
          }),
        },
      },
    }]);
    const subgraph2 = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        type Query {
          testNestedField: TestNestedField
        }

        type TestNestedField {
          subgraph2: TestUser2!
        }

        type TestUser2 {
          id: String!
          email: String!
          sub2: Boolean!
        }
      `),
      resolvers: {
        Query: {
          testNestedField: () => ({
            subgraph2: () => ({
              id: 'user2',
              email: 'user2@example.com',
              sub2: true,
            }),
          }),
        },
      },
    }]);

    const gatewaySchema = await getStitchedSchemaFromLocalSchemas({
      localSchemas: {
        subgraph1,
        subgraph2,
      },
    });

    const result = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(query),
    });

    expect(result).toEqual(expectedResult);
  });
  it('Mutations should not be batched', async () => {
    const SUBGRAPHA = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        type Query {
          test: String
        }

        type Mutation {
          testMutation: String
        }
      `),
      resolvers: {
        Query: {
          test: () => 'test',
        },
        Mutation: {
          testMutation: () => 'testMutation',
        },
      },
    }]);
    const SUBGRAPHB = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        type Query {
          test: String
        }

        type Mutation {
          testMutation: String
        }
      `),
      resolvers: {
        Query: {
          test: () => 'test',
        },
        Mutation: {
          testMutation: () => 'testMutation',
        },
      },
    }]);
    const onSubgraphExecuteFn =
      jest.fn<
        (
          subgraph: string,
          executionRequest: ExecutionRequest,
          result: ExecutionResult | AsyncIterable<ExecutionResult>,
        ) => void
      >();
    const gatewaySchema = await getStitchedSchemaFromLocalSchemas({
      localSchemas: {
        SUBGRAPHA,
        SUBGRAPHB,
      },
      onSubgraphExecute: onSubgraphExecuteFn,
    });

    const result = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(/* GraphQL */ `
        mutation {
          testMutation
        }
      `),
    });

    expect(result).toEqual({
      data: {
        testMutation: 'testMutation',
      },
    });

    expect(onSubgraphExecuteFn).toHaveBeenCalledTimes(1);
  });
  it('should choose the best mutation root field', async () => {
    const SUBGRAPHA = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        type Query {
          test: String
        }

        type Mutation {
          testMutation: TestMutationResult
        }

        type TestMutationResult @key(fields: "shared") {
          onlyA: String
          shared: String
        }
      `),
      resolvers: {
        Query: {
          test: () => 'test',
        },
        Mutation: {
          testMutation: () => ({
            onlyA: 'onlyA',
            shared: 'shared',
          }),
        },
      },
    }]);
    const SUBGRAPHB = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        type Query {
          test: String
        }

        type Mutation {
          testMutation: TestMutationResult
        }

        type TestMutationResult @key(fields: "shared") {
          onlyB: String
          shared: String
        }
      `),
      resolvers: {
        Query: {
          test: () => 'test',
        },
        Mutation: {
          testMutation: () => ({
            onlyB: 'onlyB',
            shared: 'shared',
          }),
        },
      },
    }]);
    const onSubgraphExecuteFn =
      jest.fn<
        (
          subgraph: string,
          executionRequest: ExecutionRequest,
          result: ExecutionResult | AsyncIterable<ExecutionResult>,
        ) => void
      >();
    const gatewaySchema = await getStitchedSchemaFromLocalSchemas({
      localSchemas: {
        SUBGRAPHA,
        SUBGRAPHB,
      },
      onSubgraphExecute: onSubgraphExecuteFn,
    });

    const resultA = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(/* GraphQL */ `
        mutation {
          testMutation {
            onlyA
          }
        }
      `),
    });

    expect(resultA).toEqual({
      data: {
        testMutation: {
          onlyA: 'onlyA',
        },
      },
    });

    expect(onSubgraphExecuteFn).toHaveBeenCalledTimes(1);
    expect(onSubgraphExecuteFn.mock.calls[0]?.[0]).toBe('SUBGRAPHA');
    const resultB = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(/* GraphQL */ `
        mutation {
          testMutation {
            onlyB
          }
        }
      `),
    });

    expect(resultB).toEqual({
      data: {
        testMutation: {
          onlyB: 'onlyB',
        },
      },
    });

    expect(onSubgraphExecuteFn).toHaveBeenCalledTimes(2);
    expect(onSubgraphExecuteFn.mock.calls[1]?.[0]).toBe('SUBGRAPHB');
  });
  it('should choose the best subscription root field in case of multiple entry points(keys)', async () => {
    interface Review {
      id: string;
      url: string;
      comment: string;
    }
    const reviews: Review[] = [
      {
        id: 'r1',
        url: 'http://r1',
        comment: 'Tractor 👍',
      },
      {
        id: 'r2',
        url: 'http://r2',
        comment: 'Washing machine 👎',
      },
    ];
    const REVIEWS = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        type Query {
          allReviews: [Review!]!
        }
        type Subscription {
          newReview: Review!
        }
        type Review @key(fields: "id") @key(fields: "url") {
          id: ID!
          url: String!
          comment: String!
        }
      `),
      resolvers: {
        Query: {
          allReviews: () => reviews,
        },
        Subscription: {
          newReview: {
            async *subscribe() {
              yield { newReview: reviews[reviews.length - 1] };
            },
          },
        },
      },
    }]);

    const gatewaySchema = await getStitchedSchemaFromLocalSchemas({
      localSchemas: {
        REVIEWS,
      },
    });

    const newReviewSub = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(/* GraphQL */ `
        subscription {
          newReview {
            id
          }
        }
      `),
    });
    assertAsyncIterable(newReviewSub);
    const iter = newReviewSub[Symbol.asyncIterator]();

    await expect(iter.next()).resolves.toMatchInlineSnapshot(`
      {
        "done": false,
        "value": {
          "data": {
            "newReview": {
              "id": "r2",
            },
          },
        },
      }
    `);

    await expect(iter.next()).resolves.toMatchInlineSnapshot(`
      {
        "done": true,
        "value": undefined,
      }
    `);
  });
  it('should choose the best subscription root field in case of conflicting fields', async () => {
    interface Event {
      id: string;
      message: string;
      time: number;
    }
    const allEvents: Event[] = [
      {
        id: 'e1',
        message: 'Event 1',
        time: 1,
      },
      {
        id: 'e2',
        message: 'Event 2',
        time: 2,
      },
    ];
    const EVENTSWITHMESSAGES = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.5"
            import: ["@key", "@shareable"]
          ) {
          query: Query
          subscription: Subscription
        }

        type Query {
          allEventsWithMessage: [Event!]!
        }
        type Subscription {
          newEvent: Event! @shareable
        }
        type Event @key(fields: "id") {
          id: ID!
          message: String!
        }
      `),
      resolvers: {
        Query: {
          allEventsWithMessage: () => allEvents,
        },
        Subscription: {
          newEvent: {
            async *subscribe() {
              for (const event of allEvents) {
                yield { newEvent: event };
              }
            },
          },
        },
      },
    }]);
    const EVENTSWITHTIME = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.5"
            import: ["@key", "@shareable"]
          ) {
          query: Query
          subscription: Subscription
        }

        type Query {
          allEventsWithTime: [Event!]!
        }
        type Subscription {
          newEvent: Event! @shareable
        }
        type Event @key(fields: "id") {
          id: ID!
          time: Int!
        }
      `),
      resolvers: {
        Query: {
          allEventsWithTime: () => allEvents,
        },
        Subscription: {
          newEvent: {
            async *subscribe() {
              for (const event of allEvents) {
                yield { newEvent: event };
              }
            },
          },
        },
      },
    }]);

    let subgraphCalls: Record<string, number> = {};
    const gatewaySchema = await getStitchedSchemaFromLocalSchemas({
      localSchemas: {
        EVENTSWITHMESSAGES,
        EVENTSWITHTIME,
      },
      composeWith: 'guild',
      ignoreRules: ['InvalidFieldSharingRule'],
      onSubgraphExecute(subgraph) {
        subgraphCalls[subgraph] = (subgraphCalls[subgraph] || 0) + 1;
      },
    });

    const eventsWithMessageSub = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(/* GraphQL */ `
        subscription {
          newEvent {
            message
          }
        }
      `),
    });
    assertAsyncIterable(eventsWithMessageSub);
    const collectedEventsWithMessage: ExecutionResult[] = [];
    for await (const result of eventsWithMessageSub) {
      collectedEventsWithMessage.push(result);
    }
    expect(collectedEventsWithMessage).toEqual(
      allEvents.map(({ message }) => ({ data: { newEvent: { message } } })),
    );
    expect(subgraphCalls).toEqual({
      EVENTSWITHMESSAGES: 1,
    });
    subgraphCalls = {};
    const eventsWithTimeSub = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(/* GraphQL */ `
        subscription {
          newEvent {
            time
          }
        }
      `),
    });
    assertAsyncIterable(eventsWithTimeSub);
    const collectedEventsWithTime: ExecutionResult[] = [];
    for await (const result of eventsWithTimeSub) {
      collectedEventsWithTime.push(result);
    }
    expect(collectedEventsWithTime).toEqual(
      allEvents.map(({ time }) => ({ data: { newEvent: { time } } })),
    );
    expect(subgraphCalls).toEqual({
      EVENTSWITHTIME: 1,
    });
  });

  it('returns the correct error for non-nullable fields when it is a shared root field', async () => {
    const subgraph1 = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        type Query {
          testNestedField: TestNestedField
        }

        type TestNestedField {
          subgraph1: TestUser1
          nonNullableFail: TestUser1!
          nullableFail: TestUser1
        }

        type TestUser1 {
          id: String!
          email: String!
          sub1: Boolean!
        }
      `),
      resolvers: {
        Query: {
          testNestedField: () => ({
            subgraph1: () => ({
              id: 'user1',
              email: 'user1@example.com',
              sub1: true,
            }),
            nonNullableFail: () => {
              throw new GraphQLError('My original subgraph error!', {
                extensions: {
                  code: 'BAD_REQUEST',
                },
              });
            },
            nullableFail: () => {
              throw new GraphQLError('My original subgraph error!', {
                extensions: {
                  code: 'BAD_REQUEST',
                },
              });
            },
          }),
        },
      },
    }]);

    const subgraph2 = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        type Query {
          testNestedField: TestNestedField
        }

        type TestNestedField {
          subgraph2: TestUser2
        }

        type TestUser2 {
          id: String!
          email: String!
          sub2: Boolean!
        }
      `),
      resolvers: {
        Query: {
          testNestedField: () => ({
            subgraph2: () => ({
              id: 'user2',
              email: 'user2@example.com',
              sub2: true,
            }),
          }),
        },
      },
    }]);
    const stitchedSchema = await getStitchedSchemaFromLocalSchemas({
      localSchemas: {
        subgraph1,
        subgraph2,
      },
    });
    const result = await normalizedExecutor({
      schema: stitchedSchema,
      document: parse(/* GraphQL */ `
        query {
          testNestedField {
            nonNullableFail {
              id
              email
              sub1
            }
            subgraph2 {
              id
              email
              sub2
            }
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        testNestedField: null,
      },
      errors: [
        expect.objectContaining({
          message: 'My original subgraph error!',
          path: ['testNestedField', 'nonNullableFail'],
        }),
      ],
    });
  });

  it('Aliased shared root fields named after object built-ins', async () => {
    const subgraphA = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.3"
            import: ["@key", "@shareable"]
          )

        type Query {
          shared: Shared @shareable
        }

        type Shared @key(fields: "id") {
          id: ID!
          fieldA: String
        }
      `),
      resolvers: {
        Query: {
          shared: () => ({ id: '1', fieldA: 'from subgraph A' }),
        },
      },
    }]);

    const subgraphB = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.3"
            import: ["@key", "@shareable"]
          )

        type Query {
          shared: Shared @shareable
        }

        type Shared @key(fields: "id") {
          id: ID!
          fieldB: Child1
        }

        type Child1 {
          child: Child2
        }

        type Child2 {
          value: String
        }
      `),
      resolvers: {
        Query: {
          shared: () => ({
            id: '1',
            fieldB: { child: { value: 'from subgraph B' } },
          }),
        },
      },
    }]);

    const gatewaySchema = await getStitchedSchemaFromLocalSchemas({
      localSchemas: { a: subgraphA, b: subgraphB },
    });

    const result = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(/* GraphQL */ `
        {
          shared {
            fieldA
            constructor: fieldB {
              __proto__: child {
                call: value
              }
            }
          }
        }
      `),
    });

    // the aliased dangerous keys are dropped, the rest of the response is intact
    expect(result).toEqual({
      data: {
        shared: {
          fieldA: 'from subgraph A',
          constructor: null,
        },
      },
    });
    expect(({} as any).call).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('call');
    expect(typeof Function.prototype.call).toBe('function');
    expect(() => (() => 'still works').call(null)).not.toThrow();
  });

  it('Aliased entity fields named after object built-ins', async () => {
    const subgraphA = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.3"
            import: ["@key", "@shareable"]
          )

        type Query {
          user: User
        }

        type User @key(fields: "id") {
          id: ID!
          profile: Profile @shareable
        }

        type Profile @shareable {
          name: String
        }
      `),
      resolvers: {
        Query: {
          user: () => ({ id: '1', profile: { name: 'from subgraph A' } }),
        },
      },
    }]);

    const subgraphB = buildSubgraphSchema([{
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.3"
            import: ["@key", "@shareable"]
          )

        type User @key(fields: "id") {
          id: ID!
          profile: Profile @shareable
        }

        type Profile @shareable {
          deep: Deep
        }

        type Deep {
          inner: Inner
        }

        type Inner {
          value: String
        }
      `),
      resolvers: {
        User: {
          __resolveReference: (ref: { id: string }) => ({
            id: ref.id,
            profile: { deep: { inner: { value: 'from subgraph B' } } },
          }),
        },
      },
    }]);

    const gatewaySchema = await getStitchedSchemaFromLocalSchemas({
      localSchemas: { a: subgraphA, b: subgraphB },
    });

    const result = await normalizedExecutor({
      schema: gatewaySchema,
      document: parse(/* GraphQL */ `
        {
          user {
            profile {
              name
              constructor: deep {
                __proto__: inner {
                  call: value
                }
              }
            }
          }
        }
      `),
    });

    expect(result).toEqual({
      data: {
        user: {
          profile: {
            name: 'from subgraph A',
            constructor: null,
          },
        },
      },
    });
    expect(({} as any).call).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('call');
    expect(typeof Function.prototype.call).toBe('function');
  });
});
