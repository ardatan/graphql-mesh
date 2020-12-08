import GroupTransform from '../src/index';
import { buildSchema, execute, parse, printSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';
import { wrapSchema } from '@graphql-tools/wrap';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('group', () => {
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
    `,
    resolvers: {
      Query: {
        getSomething: () => 'boop',
      },
    },
  });
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;

  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should group root operations under a specific type', async () => {
    const { data: resultBefore } = await execute({
      schema,
      document: parse(`{ getSomething }`),
    });
    expect(resultBefore.getSomething).toBe('boop');

    const newSchema = wrapSchema({
      schema,
      transforms: [
        new GroupTransform({
          config: [],
          cache,
          pubsub,
          apiName: 'test',
        }),
      ],
    });

    const { data: resultAfter } = await execute({
      schema: newSchema,
      document: parse(`{ test { getSomething } }`),
    });

    // Here, "resultAfter.test" is null
    expect(resultAfter.test.getSomething).toBe('boop');
  });
});
