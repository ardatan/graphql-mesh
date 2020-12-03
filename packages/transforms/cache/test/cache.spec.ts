import { YamlConfig, MeshPubSub, KeyValueCache } from '@graphql-mesh/types';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { addResolversToSchema } from '@graphql-tools/schema';
import {
  GraphQLSchema,
  buildSchema,
  execute,
  parse,
  DocumentNode,
  GraphQLObjectType,
  OperationDefinitionNode,
  FieldNode,
} from 'graphql';
import CacheTransform from '../src';
import { computeCacheKey } from '../src/compute-cache-key';
import objectHash from 'object-hash';
import { format } from 'date-fns';
import { applyResolversHooksToSchema } from '@graphql-mesh/runtime';
import { PubSub } from 'graphql-subscriptions';

const wait = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

const MOCK_DATA = [
  {
    id: '1',
    username: 'dotansimha',
    email: 'dotan@mail.com',
    profile: {
      name: 'Dotan',
      age: 10,
    },
  },
  {
    id: '2',
    username: 'ardatan',
    email: 'arda@mail.com',
    profile: {
      name: 'Ardatan',
      age: 12,
    },
  },
  {
    id: '3',
    username: 'kamilkisiela',
    email: 'kamil@mail.com',
    profile: {
      name: 'Kamil',
      age: 5,
    },
  },
];

const spies = {
  Mutation: {
    updateUser: jest.fn().mockImplementation((_, { userId, name }) => {
      const user = MOCK_DATA.find(u => u.id.toString() === userId.toString());

      if (!user) {
        throw new Error(`Unable to find user ${userId}!`);
      }

      user.profile.name = name;

      return user;
    }),
    deleteUser: jest.fn().mockImplementation((_, { userIdToDelete }) => {
      const user = MOCK_DATA.find(u => u.id.toString() === userIdToDelete.toString());

      if (!user) {
        throw new Error(`Unable to find user ${userIdToDelete}!`);
      }

      return true;
    }),
  },
  Query: {
    user: jest.fn().mockImplementation((_, { id }) => {
      return MOCK_DATA.find(u => u.id.toString() === id.toString());
    }),
    users: jest.fn().mockImplementation((_, { filter }) => {
      if (!filter) {
        return MOCK_DATA;
      }

      return MOCK_DATA.find(u => {
        if (filter.email && u.email === filter.email) {
          return true;
        }
        if (filter.username && u.username === filter.username) {
          return true;
        }
        if (filter.name && u.profile.name === filter.name) {
          return true;
        }
        if (filter.age && u.profile.age === filter.age) {
          return true;
        }

        return false;
      });
    }),
  },
};

describe('cache', () => {
  let schema: GraphQLSchema;
  let cache: KeyValueCache;
  let pubsub: MeshPubSub;

  beforeEach(() => {
    const baseSchema = buildSchema(/* GraphQL */ `
      type Query {
        user(id: ID!): User
        users(filter: SearchUsersInput): [User!]!
      }

      type Mutation {
        updateUser(userId: ID!, name: String!): User
        deleteUser(userIdToDelete: ID!): Boolean
      }

      input SearchUsersInput {
        username: String
        email: String
        name: String
        age: String
      }

      type User {
        id: ID!
        username: String!
        email: String!
        profile: Profile!
      }

      type Profile {
        name: String!
        age: Int!
      }
    `);

    schema = addResolversToSchema({
      schema: baseSchema,
      resolvers: spies,
    });

    cache = new InMemoryLRUCache();
    pubsub = new PubSub() as MeshPubSub;

    spies.Query.user.mockClear();
    spies.Query.users.mockClear();
  });

  describe('Resolvers Composition', () => {
    it('should replace resolvers correctly with a specific type and field', async () => {
      expect(schema.getQueryType()?.getFields().user.resolve).toBe(spies.Query.user);

      const transform = new CacheTransform({
        cache,
        config: [
          {
            field: 'Query.user',
          },
        ],
        pubsub,
      });
      const modifiedSchema = transform.transformSchema(schema);

      expect(modifiedSchema!.getQueryType()?.getFields().user.resolve).not.toBe(spies.Query.user);
      expect(modifiedSchema!.getQueryType()?.getFields().users.resolve).toBe(spies.Query.users);
    });

    it('should replace resolvers correctly with a wildcard', async () => {
      expect(schema.getQueryType()?.getFields().user.resolve).toBe(spies.Query.user);
      expect(schema.getQueryType()?.getFields().users.resolve).toBe(spies.Query.users);

      const transform = new CacheTransform({
        cache,
        config: [
          {
            field: 'Query.*',
          },
        ],
        pubsub,
      });

      const modifiedSchema = transform.transformSchema(schema);

      expect(modifiedSchema!.getQueryType()?.getFields().user.resolve).not.toBe(spies.Query.user);
      expect(modifiedSchema!.getQueryType()?.getFields().users.resolve).not.toBe(spies.Query.users);
    });
  });

  describe('Cache Wrapper', () => {
    const checkCache = async (config: YamlConfig.CacheTransformConfig[], cacheKeyToCheck?: string) => {
      const transform = new CacheTransform({
        cache,
        config,
        pubsub,
      });

      const modifiedSchema = transform.transformSchema(schema);

      const executeOptions = {
        schema: modifiedSchema!,
        document: parse(/* GraphQL */ `
          query user {
            user(id: 1) {
              id
              username
            }
          }
        `),
        contextValue: {},
      };

      const queryType = schema.getType('Query') as GraphQLObjectType;
      const queryFields = queryType.getFields();
      const operation = executeOptions.document.definitions[0] as OperationDefinitionNode;
      const cacheKey =
        cacheKeyToCheck ||
        computeCacheKey({
          keyStr: undefined,
          args: { id: '1' },
          info: {
            fieldName: 'user',
            parentType: queryType,
            returnType: queryFields.user.type,
            schema,
            fieldNodes: operation.selectionSet.selections as FieldNode[],
            fragments: {},
            rootValue: {},
            operation,
            variableValues: {},
            path: {
              prev: null,
              key: 'user',
            },
          } as any,
        });

      // No data in cache before calling it
      expect(await cache.get(cacheKey)).not.toBeDefined();
      // Run it for the first time
      await execute(executeOptions);
      // Original resolver should now be called
      expect(spies.Query.user.mock.calls.length).toBe(1);
      // Data should be stored in cache
      const data: any = await cache.get(cacheKey);
      const mockData = MOCK_DATA[0];
      expect(data.id).toBe(mockData.id);
      expect(data.username).toBe(mockData.username);
      // Running it again
      await execute(executeOptions);
      // No new calls to the original resolver
      expect(spies.Query.user.mock.calls.length).toBe(1);

      return {
        cache,
        executeAgain: () => execute(executeOptions),
        executeDocument: (operation: DocumentNode, variables: Record<string, any> = {}) =>
          execute({
            schema: modifiedSchema,
            document: operation,
            variableValues: variables,
          }),
      };
    };

    it('Should wrap resolver correctly with caching - without cacheKey', async () => {
      await checkCache([
        {
          field: 'Query.user',
        },
      ]);
    });

    it('Should wrap resolver correctly with caching with custom key', async () => {
      const cacheKey = `customUser`;

      await checkCache(
        [
          {
            field: 'Query.user',
            cacheKey,
          },
        ],
        cacheKey
      );
    });

    it('Should wrap resolver correctly with caching with custom key', async () => {
      const cacheKey = `customUser`;

      await checkCache(
        [
          {
            field: 'Query.user',
            cacheKey,
          },
        ],
        cacheKey
      );
    });

    it('Should clear cache correctly when TTL is set', async () => {
      const key = 'user-1';
      const { cache, executeAgain } = await checkCache(
        [
          {
            field: 'Query.user',
            cacheKey: key,
            invalidate: {
              ttl: 1,
            },
          },
        ],
        key
      );

      expect(await cache.get(key)).toBeDefined();
      await wait(1.1);
      expect(await cache.get(key)).not.toBeDefined();
      await executeAgain();
      expect(await cache.get(key)).toBeDefined();
    });

    it('Should wrap resolver correctly with caching with custom calculated key - and ensure calling resovler again when key is different', async () => {
      const { cache, executeDocument } = await checkCache(
        [
          {
            field: 'Query.user',
            cacheKey: `query-user-{args.id}`,
          },
        ],
        'query-user-1'
      );

      const otherIdQuery = parse(/* GraphQL */ `
        query user {
          user(id: 2) {
            id
          }
        }
      `);

      expect(await cache.get('query-user-2')).not.toBeDefined();
      await executeDocument(otherIdQuery);
      const cachedObj: any = await cache.get('query-user-2');
      const mockObj = MOCK_DATA[1];
      expect(cachedObj.id).toBe(mockObj.id);
      expect(spies.Query.user.mock.calls.length).toBe(2);
      await executeDocument(otherIdQuery);
      expect(spies.Query.user.mock.calls.length).toBe(2);
    });

    it('Should work correctly with argsHash', async () => {
      const expectedHash = `query-user-${objectHash({ id: '1' })}`;

      await checkCache(
        [
          {
            field: 'Query.user',
            cacheKey: `query-user-{argsHash}`,
          },
        ],
        expectedHash
      );
    });

    it('Should work correctly with hash helper', async () => {
      const expectedHash = objectHash('1');

      await checkCache(
        [
          {
            field: 'Query.user',
            cacheKey: `{args.id|hash}`,
          },
        ],
        expectedHash
      );
    });

    it('Should work correctly with date helper', async () => {
      const expectedHash = `1-${format(new Date(), `yyyy-MM-dd`)}`;

      await checkCache(
        [
          {
            field: 'Query.user',
            cacheKey: `{args.id}-{yyyy-MM-dd|date}`,
          },
        ],
        expectedHash
      );
    });
  });

  describe('Opration-based invalidation', () => {
    it('Should invalidate cache when mutation is done based on key', async () => {
      const schemaWithHooks = applyResolversHooksToSchema(schema, pubsub);

      const transform = new CacheTransform({
        config: [
          {
            field: 'Query.user',
            cacheKey: 'query-user-{args.id}',
            invalidate: {
              effectingOperations: [
                {
                  operation: 'Mutation.updateUser',
                  matchKey: 'query-user-{args.userId}',
                },
                {
                  operation: 'Mutation.deleteUser',
                  matchKey: 'query-user-{args.userIdToDelete}',
                },
              ],
            },
          },
        ],
        cache,
        pubsub,
      });

      const schemaWithCache = transform.transformSchema(schemaWithHooks);

      const expectedCacheKey = `query-user-1`;

      const executeOptions = {
        schema: schemaWithCache!,
        document: parse(/* GraphQL */ `
          query user {
            user(id: 1) {
              id
              name
            }
          }
        `),
      };

      // Make sure cache works as needed, runs resolvers logic only once
      expect(await cache.get(expectedCacheKey)).not.toBeDefined();
      expect(spies.Query.user.mock.calls.length).toBe(0);
      await execute(executeOptions);
      expect(await cache.get(expectedCacheKey)).toBeDefined();
      expect(spies.Query.user.mock.calls.length).toBe(1);
      await execute(executeOptions);
      expect(spies.Query.user.mock.calls.length).toBe(1);

      // Run effecting mutation
      await execute({
        schema: schemaWithCache!,
        document: parse(/* GraphQL */ `
          mutation updateUser {
            updateUser(userId: 1, name: "test new") {
              id
              name
            }
          }
        `),
      });

      // Cache should be empty now, no calls for resolvers since then
      expect(await cache.get(expectedCacheKey)).not.toBeDefined();
      expect(spies.Query.user.mock.calls.length).toBe(1);

      // Running again query, cache should be filled and resolver should get called again
      await execute(executeOptions);
      expect(await cache.get(expectedCacheKey)).toBeDefined();
      expect(spies.Query.user.mock.calls.length).toBe(2);
    });
  });
});
