import { makeExecutableSchema } from '@graphql-tools/schema';
import { wrapSchema } from '@graphql-tools/wrap';
import { YamlConfig, MeshPubSub } from '@graphql-mesh/types';
import { buildSchema, execute, graphql, parse } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { PubSub } from 'graphql-subscriptions';
import MockingTransform from '../src';

describe('mocking', () => {
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  const baseDir: string = __dirname;

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
          apiName: '',
          syncImportFn: require,
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
          custom: './mocks.ts#id',
        },
        {
          apply: 'User.fullName',
          custom: './mocks.ts#fullName',
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
          apiName: '',
          syncImportFn: require,
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
    expect(users[0]).toBeTruthy();
    expect(users[0].id).toBe('sample-id');
    expect(users[0].fullName).toBe('John Snow');
  });
  it('should custom resolvers work with mock store', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        user(id: ID): User
      }
      type Mutation {
        addUser(name: String): User
        updateUser(id: ID, name: String): User
      }
      type User {
        id: ID
        name: String
      }
    `);
    const mockedSchema = wrapSchema({
      schema,
      transforms: [
        new MockingTransform({
          config: {
            mocks: [
              {
                apply: 'Query.user',
                custom: './mocks.ts#GetUserMock',
              },
              {
                apply: 'Mutation.addUser',
                custom: './mocks.ts#AddUserMock',
              },
              {
                apply: 'Mutation.updateUser',
                custom: './mocks.ts#UpdateUserMock',
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
          apiName: '',
          syncImportFn: require,
        }),
      ],
    });
    const ADD_USER = parse(/* GraphQL */ `
      mutation AddUser {
        addUser(name: "John Doe") {
          id
          name
        }
      }
    `);
    const addUserResult = await execute(mockedSchema, ADD_USER);
    expect(addUserResult?.data?.addUser?.name).toBe('John Doe');
    const addedUserId = addUserResult.data.addUser.id;
    const GET_USER = parse(/* GraphQL */ `
      query GetUser {
        user(id: "${addedUserId}") {
          id
          name
        }
      }
    `);
    const getUserResult = await execute(mockedSchema, GET_USER);
    expect(getUserResult?.data?.user?.id).toBe(addedUserId);
    expect(getUserResult?.data?.user?.name).toBe('John Doe');
    const UPDATE_USER = parse(/* GraphQL */ `
      mutation UpdateUser {
        updateUser(id: "${addedUserId}", name: "Jane Doe") {
          id
          name
        }
      }
    `);
    const updateUserResult = await execute(mockedSchema, UPDATE_USER);
    expect(updateUserResult?.data?.updateUser?.id).toBe(addedUserId);
    expect(updateUserResult?.data?.updateUser?.name).toBe('Jane Doe');
  });
  it('should declarative API work with mock store', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        user(id: ID): User
      }
      type Mutation {
        addUser(name: String): User
        updateUser(id: ID, name: String): User
      }
      type User {
        id: ID
        name: String
      }
    `);
    const mockedSchema = wrapSchema({
      schema,
      transforms: [
        new MockingTransform({
          config: {
            mocks: [
              {
                apply: 'Query.user',
                store: {
                  type: 'User',
                  key: '{args.id}',
                },
              },
              {
                apply: 'Mutation.addUser',
                updateStore: [
                  {
                    type: 'User',
                    key: '{random}',
                    fieldName: 'name',
                    value: '{args.name}',
                  },
                ],
                store: {
                  type: 'User',
                  key: '{random}',
                },
              },
              {
                apply: 'Mutation.updateUser',
                updateStore: [
                  {
                    type: 'User',
                    key: '{args.id}',
                    fieldName: 'name',
                    value: '{args.name}',
                  },
                ],
                store: {
                  type: 'User',
                  key: '{args.id}',
                },
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
          apiName: '',
          syncImportFn: require,
        }),
      ],
    });
    const ADD_USER = parse(/* GraphQL */ `
      mutation AddUser {
        addUser(name: "John Doe") {
          id
          name
        }
      }
    `);
    const addUserResult = await execute(mockedSchema, ADD_USER);
    expect(addUserResult?.data?.addUser?.name).toBe('John Doe');
    const addedUserId = addUserResult.data.addUser.id;
    const GET_USER = parse(/* GraphQL */ `
      query GetUser {
        user(id: "${addedUserId}") {
          id
          name
        }
      }
    `);
    const getUserResult = await execute(mockedSchema, GET_USER);
    expect(getUserResult?.data?.user?.id).toBe(addedUserId);
    expect(getUserResult?.data?.user?.name).toBe('John Doe');
    const UPDATE_USER = parse(/* GraphQL */ `
      mutation UpdateUser {
        updateUser(id: "${addedUserId}", name: "Jane Doe") {
          id
          name
        }
      }
    `);
    const updateUserResult = await execute(mockedSchema, UPDATE_USER);
    expect(updateUserResult?.data?.updateUser?.id).toBe(addedUserId);
    expect(updateUserResult?.data?.updateUser?.name).toBe('Jane Doe');
  });
});
