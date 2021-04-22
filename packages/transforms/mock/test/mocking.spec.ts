import { makeExecutableSchema } from '@graphql-tools/schema';
import { wrapSchema } from '@graphql-tools/wrap';
import { YamlConfig, MeshPubSub } from '@graphql-mesh/types';
import { graphql } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { PubSub } from 'graphql-subscriptions';
import MockingTransform from '../src';

describe('mocking', () => {
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;

  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should mock fields and resolvers should not get called', async () => {
    let queryUserCalled = false;
    let userFullNameCalled = false;
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID
          fullName: String
        }
        type Query {
          users: [User]
        }
      `,
      resolvers: {
        Query: {
          users: () => {
            queryUserCalled = true;
            return [{}, {}, {}, {}, {}, {}];
          },
        },
        User: {
          id: () => 'NOTID',
          fullName: () => {
            userFullNameCalled = true;
            return 'fullName';
          },
        },
      },
    });
    const mockingConfig: YamlConfig.MockingConfig = {
      mocks: [
        {
          apply: 'User.fullName',
          faker: '{{name.lastName}}, {{name.firstName}} {{name.suffix}}',
        },
      ],
    };
    const transformedSchema = await wrapSchema({
      schema,
      transforms: [
        new MockingTransform({
          config: mockingConfig,
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });
    const result = await graphql({
      schema: transformedSchema,
      source: /* GraphQL */ `
        {
          users {
            id
            fullName
          }
        }
      `,
      contextValue: {},
    });

    const users = result.data?.users;
    expect(users).toBeTruthy();
    expect(users).toHaveLength(1);
    expect(users[0]).toBeTruthy();
    expect(users[0].id).not.toBe('NOTID');
    expect(users[0].fullName).not.toBe('fullName');
    expect(queryUserCalled).toBeFalsy();
    expect(userFullNameCalled).toBeFalsy();
  });

  it('should mock fields by using the "custom" property', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID
          fullName: String
        }
        type Query {
          users: [User]
        }
      `,
      resolvers: {
        Query: {
          users: () => [],
        },
        User: {
          id: () => 'sample-id-coming-from-the-resolver',
          fullName: () => 'Sample name coming from the resolver',
        },
      },
    });

    const mockingConfig: YamlConfig.MockingConfig = {
      mocks: [
        {
          apply: 'User.id',
          custom: './packages/transforms/mock/test/mocks.ts#id',
        },
        {
          apply: 'User.fullName',
          custom: './packages/transforms/mock/test/mocks.ts#fullName',
        },
      ],
    };

    const transformedSchema = await wrapSchema({
      schema,
      transforms: [
        new MockingTransform({
          config: mockingConfig,
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const result = await graphql({
      schema: transformedSchema,
      source: /* GraphQL */ `
        {
          users {
            id
            fullName
          }
        }
      `,
      contextValue: {},
    });

    const users = result.data?.users;
    expect(users).toBeTruthy();
    expect(users).toHaveLength(1);
    expect(users[0]).toBeTruthy();
    expect(users[0].id).toBe('sample-id');
    expect(users[0].fullName).toBe('John Snow');
  });
});
