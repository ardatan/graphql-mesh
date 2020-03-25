import { YamlConfig } from '@graphql-mesh/types';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { addResolveFunctionsToSchema } from 'graphql-tools-fork';
import {
  GraphQLSchema,
  buildSchema,
  execute,
  parse,
  DocumentNode
} from 'graphql';
import cacheTransform, { computeCacheKey } from '../src';
import objectHash from 'object-hash';

const wait = (seconds: number) =>
  new Promise(resolve => setTimeout(resolve, seconds * 1000));

const MOCK_DATA = [
  {
    id: 1,
    username: 'dotansimha',
    email: 'dotan@mail.com',
    profile: {
      name: 'Dotan',
      age: 10
    }
  },
  {
    id: 2,
    username: 'ardatan',
    email: 'arda@mail.com',
    profile: {
      name: 'Ardatan',
      age: 12
    }
  },
  {
    id: 3,
    username: 'kamilkisiela',
    email: 'kamil@mail.com',
    profile: {
      name: 'Kamil',
      age: 5
    }
  }
];

const spies = {
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
    })
  }
};

describe('cache', () => {
  let schema: GraphQLSchema;

  beforeEach(() => {
    const baseSchema = buildSchema(/* GraphQL */ `
      type Query {
        user(id: ID!): User
        users(filter: SearchUsersInput): [User!]!
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

    schema = addResolveFunctionsToSchema({
      schema: baseSchema,
      resolvers: spies
    });

    spies.Query.user.mockClear();
    spies.Query.users.mockClear();
  });

  describe('Resolvers Composition', () => {
    const cache = new InMemoryLRUCache();

    it('should replace resolvers correctly with a specific type and field', async () => {
      expect(schema.getQueryType()?.getFields()['user'].resolve).toBe(
        spies.Query.user
      );

      const modifiedSchema = await cacheTransform({
        schema,
        cache,
        config: [
          {
            field: 'Query.user'
          }
        ]
      });

      expect(
        modifiedSchema.getQueryType()?.getFields()['user'].resolve
      ).not.toBe(spies.Query.user);
      expect(modifiedSchema.getQueryType()?.getFields()['users'].resolve).toBe(
        spies.Query.users
      );
    });

    it('should replace resolvers correctly with a wildcard', async () => {
      expect(schema.getQueryType()?.getFields()['user'].resolve).toBe(
        spies.Query.user
      );
      expect(schema.getQueryType()?.getFields()['users'].resolve).toBe(
        spies.Query.users
      );

      const modifiedSchema = await cacheTransform({
        schema,
        cache,
        config: [
          {
            field: 'Query.*'
          }
        ]
      });

      expect(
        modifiedSchema.getQueryType()?.getFields()['user'].resolve
      ).not.toBe(spies.Query.user);
      expect(
        modifiedSchema.getQueryType()?.getFields()['users'].resolve
      ).not.toBe(spies.Query.users);
    });
  });

  describe('Cache Wrapper', () => {
    const checkCache = async (
      config: YamlConfig.CacheTransformConfig[],
      cacheKeyToCheck?: string
    ) => {
      const cache = new InMemoryLRUCache();

      const modifiedSchema = await cacheTransform({
        schema,
        cache,
        config
      });

      const executeOptions = {
        schema: modifiedSchema,
        document: parse(/* GraphQL */ `
          query user {
            user(id: 1) {
              id
              name
            }
          }
        `),
        contextValue: {}
      };

      const cacheKey =
        cacheKeyToCheck ||
        computeCacheKey({
          keyStr: undefined,
          args: {},
          schema,
          info: {
            fieldName: 'user',
            parentType: {
              name: 'Query'
            }
          } as any
        });

      // No data in cache before calling it
      expect(await cache.get(cacheKey)).not.toBeDefined();
      // Run it for the first time
      await execute(executeOptions);
      // Original resolver should now be called
      expect(spies.Query.user.mock.calls.length).toBe(1);
      // Data should be stored in cache
      expect(await cache.get(cacheKey)).toBe(MOCK_DATA[0]);
      // Running it again
      await execute(executeOptions);
      // No new calls to the original resolver
      expect(spies.Query.user.mock.calls.length).toBe(1);

      return {
        cache,
        executeAgain: () => execute(executeOptions),
        executeDocument: (
          operation: DocumentNode,
          variables: Record<string, any> = {}
        ) =>
          execute({
            schema: modifiedSchema,
            document: operation,
            variableValues: variables
          })
      };
    };

    it('Should wrap resolver correctly with caching - without cacheKey', async () => {
      await checkCache([
        {
          field: 'Query.user'
        }
      ]);
    });

    it('Should wrap resolver correctly with caching with custom key', async () => {
      const cacheKey = `customUser`;

      await checkCache(
        [
          {
            field: 'Query.user',
            cacheKey
          }
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
            cacheKey
          }
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
              ttl: 1
            }
          }
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
            cacheKey: `query-user-{args.id}`
          }
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
      expect(await cache.get('query-user-2')).toBe(MOCK_DATA[1]);
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
            cacheKey: `query-user-{argsHash}`
          }
        ],
        expectedHash
      );
    });

    it.only('Should work correctly with hash helper', async () => {
      const expectedHash = objectHash('1');

      await checkCache(
        [
          {
            field: 'Query.user',
            cacheKey: `{args.id|hash}`
          }
        ],
        expectedHash
      );
    });
  });
});
