import dayjs from 'dayjs';
import {
  buildSchema,
  execute,
  GraphQLObjectType,
  GraphQLSchema,
  parse,
  type DocumentNode,
  type FieldNode,
  type OperationDefinitionNode,
} from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { hashObject } from '@graphql-mesh/string-interpolation';
import type { ImportFn, MeshPubSub, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { addResolversToSchema, makeExecutableSchema } from '@graphql-tools/schema';
import { dummyLogger as logger } from '../../../../testing/dummyLogger';
import { computeCacheKey } from '../src/compute-cache-key.js';
import CacheTransform from '../src/index.js';

const wait = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));
const importFn: ImportFn = m => import(m);

function getSlowCache(cache: InMemoryLRUCache) {
  return new Proxy(cache, {
    get(target, prop, receiver) {
      if (typeof target[prop] === 'function') {
        return function slowedFn(...args: any[]) {
          return new Promise(resolve => {
            const timeout = setTimeout(() => {
              resolve(target[prop](...args));
              target['timeouts'].delete(timeout);
            }, 50);
            target['timeouts'].add(timeout);
          });
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

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
  User: {
    friend: jest.fn().mockImplementation((_, { id }) => {
      return MOCK_DATA.find(u => u.id.toString() === id.toString());
    }),
  },
};

describe('cache', () => {
  let schema: GraphQLSchema;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;

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
        friend(id: ID!): User
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

    pubsub = new PubSub();

    spies.Query.user.mockClear();
    spies.Query.users.mockClear();
  });

  afterEach(() => {
    pubsub.publish('destroy', {} as any);
  });

  describe('Resolvers Composition', () => {
    it('should replace resolvers correctly with a specific type and field', async () => {
      using cache = new InMemoryLRUCache({ pubsub });
      expect(schema.getQueryType()?.getFields().user.resolve.name).toBe(
        spies.Query.user.bind(null).name,
      );

      const transform = new CacheTransform({
        apiName: 'test',
        importFn,
        cache,
        config: [
          {
            field: 'Query.user',
          },
        ],
        pubsub,
        baseDir,
        logger,
      });
      const modifiedSchema = transform.transformSchema(schema);

      expect(modifiedSchema!.getQueryType()?.getFields().user.resolve.name).not.toBe(
        spies.Query.user.bind(null).name,
      );
      expect(modifiedSchema!.getQueryType()?.getFields().users.resolve.name).toBe(
        spies.Query.users.bind(null).name,
      );
    });

    it('should replace resolvers correctly with a wildcard', async () => {
      using cache = new InMemoryLRUCache({ pubsub });
      expect(schema.getQueryType()?.getFields().user.resolve.name).toBe(
        spies.Query.user.bind(null).name,
      );
      expect(schema.getQueryType()?.getFields().users.resolve.name).toBe(
        spies.Query.users.bind(null).name,
      );

      const transform = new CacheTransform({
        apiName: 'test',
        importFn,
        cache,
        config: [
          {
            field: 'Query.*',
          },
        ],
        pubsub,
        baseDir,
        logger,
      });

      const modifiedSchema = transform.transformSchema(schema);

      expect(modifiedSchema!.getQueryType()?.getFields().user.resolve.name).not.toBe(
        spies.Query.user.bind(null).name,
      );
      expect(modifiedSchema!.getQueryType()?.getFields().users.resolve.name).not.toBe(
        spies.Query.users.bind(null).name,
      );
    });
  });

  describe('Cache Wrapper', () => {
    const checkCache = async (
      cache: InMemoryLRUCache,
      config: YamlConfig.CacheTransformConfig[],
      cacheKeyToCheck?: string,
    ) => {
      const transform = new CacheTransform({
        apiName: 'test',
        importFn,
        cache,
        config,
        pubsub,
        baseDir,
        logger,
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
      using cache = new InMemoryLRUCache({ pubsub });
      await checkCache(cache, [
        {
          field: 'Query.user',
        },
      ]);
    });

    it('Should wrap resolver correctly with caching with custom key', async () => {
      const cacheKey = `customUser`;
      using cache = new InMemoryLRUCache({ pubsub });
      await checkCache(
        cache,
        [
          {
            field: 'Query.user',
            cacheKey,
          },
        ],
        cacheKey,
      );
    });

    it('Should wrap resolver correctly with caching with custom key', async () => {
      const cacheKey = `customUser`;
      using cache = new InMemoryLRUCache({ pubsub });
      await checkCache(
        cache,
        [
          {
            field: 'Query.user',
            cacheKey,
          },
        ],
        cacheKey,
      );
    });

    it('Should clear cache correctly when TTL is set', async () => {
      const key = 'user-1';
      using cache = new InMemoryLRUCache({ pubsub });
      const { executeAgain } = await checkCache(
        cache,
        [
          {
            field: 'Query.user',
            cacheKey: key,
            invalidate: {
              ttl: 1,
            },
          },
        ],
        key,
      );

      expect(await cache.get(key)).toBeDefined();
      await wait(1.1);
      expect(await cache.get(key)).not.toBeDefined();
      await executeAgain();
      expect(await cache.get(key)).toBeDefined();
    });

    it('Should wrap resolver correctly with caching with custom calculated key - and ensure calling resovler again when key is different', async () => {
      using cache = new InMemoryLRUCache({ pubsub });
      const { executeDocument } = await checkCache(
        cache,
        [
          {
            field: 'Query.user',
            cacheKey: `query-user-{args.id}`,
          },
        ],
        'query-user-1',
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
      const expectedHash = `query-user-${hashObject({ id: '1' })}`;
      using cache = new InMemoryLRUCache({ pubsub });
      await checkCache(
        cache,
        [
          {
            field: 'Query.user',
            cacheKey: `query-user-{argsHash}`,
          },
        ],
        expectedHash,
      );
    });

    it('Should work correctly with hash helper', async () => {
      const expectedHash = hashObject('1');

      using cache = new InMemoryLRUCache({ pubsub });
      await checkCache(
        cache,
        [
          {
            field: 'Query.user',
            cacheKey: `{args.id|hash}`,
          },
        ],
        expectedHash,
      );
    });

    it('Should work correctly with date helper', async () => {
      const expectedHash = `1-${dayjs(new Date()).format(`yyyy-MM-dd`)}`;

      using cache = new InMemoryLRUCache({ pubsub });
      await checkCache(
        cache,
        [
          {
            field: 'Query.user',
            cacheKey: `{args.id}-{yyyy-MM-dd|date}`,
          },
        ],
        expectedHash,
      );
    });
  });

  describe('Opration-based invalidation', () => {
    it('Should invalidate cache when mutation is done based on key', async () => {
      using cache = new InMemoryLRUCache({ pubsub });
      const transform = new CacheTransform({
        apiName: 'test',
        importFn,
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
        baseDir,
        logger,
      });

      const schemaWithCache = transform.transformSchema(schema);

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

    describe('Subfields', () => {
      it('Should cache queries including subfield arguments', async () => {
        using cache = new InMemoryLRUCache({ pubsub });
        const transform = new CacheTransform({
          apiName: 'test',
          importFn,
          config: [{ field: 'Query.user' }],
          cache,
          pubsub,
          baseDir,
          logger,
        });
        const schemaWithCache = transform.transformSchema(schema);

        // First query should call resolver and fill cache
        const executeOptions1 = {
          schema: schemaWithCache,
          document: parse(/* GraphQL */ `
            query {
              user(id: 1) {
                friend(id: 2) {
                  id
                }
              }
            }
          `),
        };
        const { data: actual1 }: any = await execute(executeOptions1);
        expect(spies.Query.user.mock.calls.length).toBe(1);
        expect(actual1.user.friend.id).toBe('2');

        // Second query should call resolver and also fill cache
        const executeOptions2 = {
          schema: schemaWithCache,
          document: parse(/* GraphQL */ `
            query {
              user(id: 1) {
                friend(id: 3) {
                  id
                }
              }
            }
          `),
        };
        const { data: actual2 }: any = await execute(executeOptions2);
        expect(spies.Query.user.mock.calls.length).toBe(2);
        expect(actual2.user.friend.id).toBe('3');

        // Repeat both queries, no new calls for resolver
        const { data: repeat1 }: any = await execute(executeOptions1);
        const { data: repeat2 }: any = await execute(executeOptions2);
        expect(spies.Query.user.mock.calls.length).toBe(2);
        expect(repeat1.user.friend.id).toBe('2');
        expect(repeat2.user.friend.id).toBe('3');
      });
    });

    describe('Race condition', () => {
      it('should wait for local cache transform to finish writing the entry', async () => {
        using cache = new InMemoryLRUCache({ pubsub });
        const slowCache = getSlowCache(cache);
        const options: MeshTransformOptions<YamlConfig.CacheTransformConfig[]> = {
          apiName: 'test',
          importFn,
          config: [
            {
              field: 'Query.foo',
              cacheKey: 'random',
            },
          ],
          cache: slowCache,
          pubsub,
          baseDir,
          logger,
        };

        let callCount = 0;
        const schema = makeExecutableSchema({
          typeDefs: /* GraphQL */ `
            type Query {
              foo: String
            }
          `,
          resolvers: {
            Query: {
              foo: () =>
                new Promise(resolve => setTimeout(() => resolve((callCount++).toString()), 300)),
            },
          },
        });
        const transform = new CacheTransform(options);
        const transformedSchema = transform.transformSchema(schema);
        const query = /* GraphQL */ `
          {
            foo1: foo
            foo2: foo
          }
        `;
        const result = await execute({
          schema: transformedSchema,
          document: parse(query),
        });

        expect(result.data.foo2).toBe(result.data.foo1);
      });

      it('should wait for other cache transform to finish writing the entry when delay >= safe threshold)', async () => {
        let callCount = 0;

        using cache = new InMemoryLRUCache({ pubsub });
        const slowCache = getSlowCache(cache);
        const options: MeshTransformOptions<YamlConfig.CacheTransformConfig[]> = {
          apiName: 'test',
          importFn,
          config: [
            {
              field: 'Query.foo',
              cacheKey: 'random',
            },
          ],
          cache: slowCache,
          pubsub,
          baseDir,
          logger,
        };
        function getNewSchema() {
          return makeExecutableSchema({
            typeDefs: /* GraphQL */ `
              type Query {
                foo: String
              }
            `,
            resolvers: {
              Query: {
                foo: async () => {
                  callCount++;
                  await new Promise(resolve => setTimeout(resolve, 300));
                  return 'FOO';
                },
              },
            },
          });
        }
        const transform1 = new CacheTransform(options);
        const transformedSchema1 = transform1.transformSchema(getNewSchema());
        const transform2 = new CacheTransform(options);
        const transformedSchema2 = transform2.transformSchema(getNewSchema());
        const query = /* GraphQL */ `
          {
            foo
          }
        `;

        await execute({
          schema: transformedSchema1,
          document: parse(query),
        });
        await wait(0);
        await execute({
          schema: transformedSchema2,
          document: parse(query),
        });

        expect(callCount).toBe(1);
      });

      it('should fail to wait for other cache transform to finish writing the entry when delay < safe threshold', async () => {
        let callCount = 0;
        using cache = new InMemoryLRUCache({ pubsub });
        const options: MeshTransformOptions<YamlConfig.CacheTransformConfig[]> = {
          apiName: 'test',
          importFn,
          config: [
            {
              field: 'Query.foo',
              cacheKey: 'random',
            },
          ],
          cache,
          pubsub,
          baseDir,
          logger,
        };
        function getNewSchema() {
          return makeExecutableSchema({
            typeDefs: /* GraphQL */ `
              type Query {
                foo: String
              }
            `,
            resolvers: {
              Query: {
                foo: async () => {
                  callCount++;
                  await new Promise(resolve => setTimeout(resolve, 300));
                  return 'FOO';
                },
              },
            },
          });
        }
        const transform1 = new CacheTransform(options);
        const transformedSchema1 = transform1.transformSchema(getNewSchema());
        const transform2 = new CacheTransform(options);
        const transformedSchema2 = transform2.transformSchema(getNewSchema());
        const query = /* GraphQL */ `
          {
            foo
          }
        `;
        await Promise.all([
          execute({
            schema: transformedSchema1,
            document: parse(query),
          }),
          execute({
            schema: transformedSchema2,
            document: parse(query),
          }),
        ]);
        expect(callCount).toBe(2);
      });
    });
  });
});
