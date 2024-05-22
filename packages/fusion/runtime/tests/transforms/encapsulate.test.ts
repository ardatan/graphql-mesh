import { execute, parse } from 'graphql';
import { createEncapsulateTransform } from '@graphql-mesh/fusion-composition';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Repeater } from '@repeaterjs/repeater';
import { composeAndGetExecutor, composeAndGetPublicSchema } from '../utils';

describe('encapsulate', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        getSomething: String
        getSomethingElse: String
      }

      type Mutation {
        doSomething: String
        doSomethingElse: String
      }

      type Subscription {
        notify: String!
      }
    `,
    resolvers: {
      Query: {
        getSomething: () => 'boop',
      },
      Mutation: {
        doSomething: () => 'noop',
      },
      Subscription: {
        notify: {
          subscribe: () =>
            new Repeater((push, stop) => {
              const interval = setInterval(
                () =>
                  push({
                    notify: 'boop',
                  }),
                1000,
              );
              return stop.then(() => clearInterval(interval));
            }),
        },
      },
    },
  });

  it('groups Mutation correctly', async () => {
    const transform = createEncapsulateTransform();
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'test',
      },
    ]);
    expect(newSchema.getMutationType().getFields().test).toBeDefined();
    expect(newSchema.getMutationType().getFields().notify).not.toBeDefined();
    expect(newSchema.getMutationType().getFields().test.type.toString()).toBe('testMutation!');
  });
  it('groups Subscription correctly', async () => {
    const transform = createEncapsulateTransform();
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'test',
      },
    ]);
    expect(newSchema.getSubscriptionType().getFields().test).toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().getSomething).not.toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().test.type.toString()).toBe(
      'testSubscription!',
    );
  });
  it('groups Query correctly', async () => {
    const transform = createEncapsulateTransform();
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'test',
      },
    ]);
    expect(newSchema.getQueryType().getFields().test).toBeDefined();
    expect(newSchema.getQueryType().getFields().getSomething).not.toBeDefined();
    expect(newSchema.getQueryType().getFields().test.type.toString()).toBe('testQuery!');
  });
  it('executes queries the same way and preserves the execution flow', async () => {
    const { data: resultBefore } = await execute({
      schema,
      document: parse(`{ getSomething }`),
    });
    expect(resultBefore.getSomething).toBe('boop');
    const transform = createEncapsulateTransform();
    const executor = composeAndGetExecutor([
      {
        schema,
        transforms: [transform],
        name: 'test',
      },
    ]);

    const resultAfter = await executor({
      query: `{ test { getSomething } }`,
    });

    expect(resultAfter.test.getSomething).toBe('boop');
  });
});
