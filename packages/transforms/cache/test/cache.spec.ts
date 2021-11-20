import { YamlConfig, MeshPubSub, KeyValueCache, MeshTransformOptions } from '@graphql-mesh/types';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { addResolversToSchema, makeExecutableSchema } from '@graphql-tools/schema';
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
import { hashObject } from '@graphql-mesh/utils';
import { format } from 'date-fns';
import { applyResolversHooksToSchema } from '@graphql-mesh/runtime';
import { PubSub } from 'graphql-subscriptions';
import { cloneSchema } from 'neo4j-graphql-js/node_modules/graphql-tools';

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
  User: {
    friend: jest.fn().mockImplementation((_, { id }) => {
      return MOCK_DATA.find(u => u.id.toString() === id.toString());
    }),
  },
};

const syncImportFn = (mod: string) => require(mod);

describe('cache', () => {
  let schema: GraphQLSchema;
  let cache: KeyValueCache;
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

    cache = new InMemoryLRUCache();
    pubsub = new PubSub() as MeshPubSub;

    spies.Query.user.mockClear();
    spies.Query.users.mockClear();
  });

  describe('Resolvers Composition', () => {
    it('should replace resolvers correctly with a specific type and field', async () => {
      expect(schema.getQueryType()?.getFields().user.resolve.name).toBe(spies.Query.user.bind(null).name);

      const transform = new CacheTransform({
        apiName: 'test',
        syncImportFn,
        cache,
        config: [
          {
            field: 'Query.user',
          },
        ],
        pubsub,
        baseDir,
      });
      const modifiedSchema = transform.transformSchema(schema);

      expect(modifiedSchema!.getQueryType()?.getFields().user.resolve.name).not.toBe(spies.Query.user.bind(null).name);
      expect(modifiedSchema!.getQueryType()?.getFields().users.resolve.name).toBe(spies.Query.users.bind(null).name);
    });

    it('should replace resolvers correctly with a wildcard', async () => {
      expect(schema.getQueryType()?.getFields().user.resolve.name).toBe(spies.Query.user.bind(null).name);
      expect(schema.getQueryType()?.getFields().users.resolve.name).toBe(spies.Query.users.bind(null).name);

      const transform = new CacheTransform({
        apiName: 'test',
        syncImportFn,
        cache,
        config: [
          {
            field: 'Query.*',
          },
        ],
        pubsub,
        baseDir,
      });

      const modifiedSchema = transform.transformSchema(schema);

      expect(modifiedSchema!.getQueryType()?.getFields().user.resolve.name).not.toBe(spies.Query.user.bind(null).name);
      expect(modifiedSchema!.getQueryType()?.getFields().users.resolve.name).not.toBe(
        spies.Query.users.bind(null).name
      );
    });
  });

  describe('Cache Wrapper', () => {
    const checkCache = async (config: YamlConfig.CacheTransformConfig[], cacheKeyToCheck?: string) => {
      const transform = new CacheTransform({
        apiName: 'test',
        syncImportFn,
        cache,
        config,
        pubsub,
        baseDir,
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
      const expectedHash = `query-user-${hashObject({ id: '1' })}`;

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
      const expectedHash = hashObject('1');

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
      const schemaWithHooks = applyResolversHooksToSchema(schema, pubsub, {});

      const transform = new CacheTransform({
        apiName: 'test',
        syncImportFn,
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

    describe('Subfields', () => {
      it('Should cache queries including subfield arguments', async () => {
        const transform = new CacheTransform({
          apiName: 'test',
          syncImportFn,
          config: [{ field: 'Query.user' }],
          cache,
          pubsub,
          baseDir,
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
        const { data: actual1 } = await execute(executeOptions1);
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
        const { data: actual2 } = await execute(executeOptions2);
        expect(spies.Query.user.mock.calls.length).toBe(2);
        expect(actual2.user.friend.id).toBe('3');

        // Repeat both queries, no new calls for resolver
        const { data: repeat1 } = await execute(executeOptions1);
        const { data: repeat2 } = await execute(executeOptions2);
        expect(spies.Query.user.mock.calls.length).toBe(2);
        expect(repeat1.user.friend.id).toBe('2');
        expect(repeat2.user.friend.id).toBe('3');
      });
    });

    describe('Race condition', () => {
      it('should wait for local cache transform to finish writing the entry', async () => {
        const options: MeshTransformOptions<YamlConfig.CacheTransformConfig[]> = {
          apiName: 'test',
          syncImportFn,
          config: [
            {
              field: 'Query.foo',
              cacheKey: 'random',
            },
          ],
          cache,
          pubsub,
          baseDir,
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
              foo: () => new Promise(resolve => setTimeout(() => resolve((callCount++).toString()), 300)),
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

      it('should wait for other cache transform to finish writing the entry (delayed)', async () => {
        let callCount = 0;
        const options: MeshTransformOptions<YamlConfig.CacheTransformConfig[]> = {
          apiName: 'test',
          syncImportFn,
          config: [
            {
              field: 'Query.foo',
              cacheKey: 'random',
            },
          ],
          cache,
          pubsub,
          baseDir,
        };
        const schema = makeExecutableSchema({
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
        const transform1 = new CacheTransform(options);
        const transformedSchema1 = transform1.transformSchema(cloneSchema(schema));
        const transform2 = new CacheTransform(options);
        const transformedSchema2 = transform2.transformSchema(cloneSchema(schema));
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

      it('should fail to wait for other cache transform to finish writing the entry (no-delay)', async () => {
        let callCount = 0;
        const options: MeshTransformOptions<YamlConfig.CacheTransformConfig[]> = {
          apiName: 'test',
          syncImportFn,
          config: [
            {
              field: 'Query.foo',
              cacheKey: 'random',
            },
          ],
          cache,
          pubsub,
          baseDir,
        };
        const schema = makeExecutableSchema({
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
        const transform1 = new CacheTransform(options);
        const transformedSchema1 = transform1.transformSchema(cloneSchema(schema));
        const transform2 = new CacheTransform(options);
        const transformedSchema2 = transform2.transformSchema(cloneSchema(schema));
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
