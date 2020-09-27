import RenameTransform from './../src/index';
import { buildSchema, printSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';
import { wrapSchema } from '@graphql-tools/wrap';

describe('rename', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      user: User!
    }

    type User {
      id: ID!
    }
  `);
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should change the name of a type', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          config: [
            {
              from: 'User',
              to: 'MyUser',
            },
          ],
          cache,
          pubsub,
        }),
      ],
    });

    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('MyUser')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });
});
