import { execute, GraphQLSchema, parse, printSchema } from 'graphql';
import { createEncapsulateTransform } from '@graphql-mesh/fusion-composition';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import { composeAndGetExecutor, composeAndGetPublicSchema } from '../utils';

describe('encapsulate', () => {
  let schema: GraphQLSchema;
  beforeEach(() => {
    schema = makeExecutableSchema({
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
  });

  it('groups Mutation correctly', async () => {
    const transform = createEncapsulateTransform();
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);
    expect(newSchema.getMutationType().getFields().TEST).toBeDefined();
    expect(newSchema.getMutationType().getFields().notify).not.toBeDefined();
    expect(newSchema.getMutationType().getFields().TEST.type.toString()).toBe('TESTMutation!');
  });
  it('groups Subscription correctly', async () => {
    const transform = createEncapsulateTransform();
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);
    expect(newSchema.getSubscriptionType().getFields().TEST).toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().getSomething).not.toBeDefined();
    expect(newSchema.getSubscriptionType().getFields().TEST.type.toString()).toBe(
      'TESTSubscription!',
    );
  });
  it('groups Query correctly', async () => {
    const transform = createEncapsulateTransform();
    const newSchema = await composeAndGetPublicSchema([
      {
        schema,
        transforms: [transform],
        name: 'TEST',
      },
    ]);
    expect(newSchema.getQueryType().getFields().TEST).toBeDefined();
    expect(newSchema.getQueryType().getFields().TEST.type.toString()).toBe('TESTQuery!');
    expect(newSchema.getQueryType().getFields().getSomething).not.toBeDefined();
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
        name: 'TEST',
      },
    ]);

    const resultAfter = await executor({
      query: `{ TEST { getSomething } }`,
    });

    expect(resultAfter.TEST.getSomething).toBe('boop');
  });
});
