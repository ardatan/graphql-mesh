import { buildSchema, parse, specifiedRules, validate } from 'graphql';
import { envelop, useEngine, useSchema } from '@envelop/core';
import type { ImportFn, YamlConfig } from '@graphql-mesh/types';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import useMock, { type IMockStore } from '../src/index.js';

describe('mocking', () => {
  const baseDir: string = __dirname;
  const importFn: ImportFn = m => import(m);
  const enginePlugin = useEngine({
    parse,
    validate,
    execute: normalizedExecutor,
    subscribe: normalizedExecutor,
    specifiedRules,
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
    const getEnveloped = envelop({
      plugins: [
        enginePlugin,
        useSchema(schema),
        useMock({
          ...mockingConfig,
          baseDir,
          importFn,
        }),
      ],
    });
    const enveloped = getEnveloped();
    const result = await enveloped.execute({
      schema: enveloped.schema,
      document: enveloped.parse(/* GraphQL */ `
        {
          users {
            id
            fullName
          }
        }
      `),
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

  it('should mock fields by using the "custom" propert (module path)', async () => {
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

    const getEnveloped = envelop({
      plugins: [
        enginePlugin,
        useSchema(schema),
        useMock({
          ...mockingConfig,
          baseDir,
          importFn,
        }),
      ],
    });
    const enveloped = getEnveloped();
    const result = await enveloped.execute({
      schema: enveloped.schema,
      document: enveloped.parse(/* GraphQL */ `
        {
          users {
            id
            fullName
          }
        }
      `),
      contextValue: {},
    });

    const users = result.data?.users;
    expect(users).toBeTruthy();
    expect(users[0]).toBeTruthy();
    expect(users[0].id).toBe('sample-id');
    expect(users[0].fullName).toBe('John Snow');
  });

  it('should mock fields by using the "custom" property (function)', async () => {
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

    const { id, fullName } = await import('./mocks.js');

    const mockingConfig: YamlConfig.MockingConfig = {
      mocks: [
        {
          apply: 'User.id',
          custom: id,
        },
        {
          apply: 'User.fullName',
          custom: fullName,
        },
      ],
    };

    const getEnveloped = envelop({
      plugins: [
        enginePlugin,
        useSchema(schema),
        useMock({
          ...mockingConfig,
          baseDir,
          importFn,
        }),
      ],
    });
    const enveloped = getEnveloped();
    const result = await enveloped.execute({
      schema: enveloped.schema,
      document: enveloped.parse(/* GraphQL */ `
        {
          users {
            id
            fullName
          }
        }
      `),
      contextValue: {},
    });

    const users = result.data?.users;
    expect(users).toBeTruthy();
    expect(users[0]).toBeTruthy();
    expect(users[0].id).toBe('sample-id');
    expect(users[0].fullName).toBe('John Snow');
  });
  it('should mock fields by using the "custom" property (value directly)', async () => {
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

    const { id, fullName } = await import('./mocks.js');

    const mockingConfig: YamlConfig.MockingConfig = {
      mocks: [
        {
          apply: 'User.id',
          custom: 'sample-id',
        },
        {
          apply: 'User.fullName',
          custom: 'John Snow',
        },
      ],
    };

    const getEnveloped = envelop({
      plugins: [
        enginePlugin,
        useSchema(schema),
        useMock({
          ...mockingConfig,
          baseDir,
          importFn,
        }),
      ],
    });
    const enveloped = getEnveloped();
    const result = await enveloped.execute({
      schema: enveloped.schema,
      document: enveloped.parse(/* GraphQL */ `
        {
          users {
            id
            fullName
          }
        }
      `),
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

    const getEnveloped = envelop({
      plugins: [
        enginePlugin,
        useSchema(schema),
        useMock({
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
          baseDir,
          importFn,
        }),
      ],
    });
    const enveloped = getEnveloped();
    const ADD_USER = enveloped.parse(/* GraphQL */ `
      mutation AddUser {
        addUser(name: "John Doe") {
          id
          name
        }
      }
    `);
    const addUserResult: any = await enveloped.execute({
      schema: enveloped.schema,
      document: ADD_USER,
      contextValue: await enveloped.contextFactory({}),
    });
    expect(addUserResult?.data?.addUser?.name).toBe('John Doe');
    const addedUserId = addUserResult.data.addUser.id;
    const GET_USER = enveloped.parse(/* GraphQL */ `
      query GetUser {
        user(id: "${addedUserId}") {
          id
          name
        }
      }
    `);
    const getUserResult: any = await enveloped.execute({
      schema: enveloped.schema,
      document: GET_USER,
      contextValue: await enveloped.contextFactory({}),
    });
    expect(getUserResult?.data?.user?.id).toBe(addedUserId);
    expect(getUserResult?.data?.user?.name).toBe('John Doe');
    const UPDATE_USER = enveloped.parse(/* GraphQL */ `
      mutation UpdateUser {
        updateUser(id: "${addedUserId}", name: "Jane Doe") {
          id
          name
        }
      }
    `);
    const updateUserResult: any = await enveloped.execute({
      schema: enveloped.schema,
      document: UPDATE_USER,
      contextValue: await enveloped.contextFactory({}),
    });
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
    const getEnveloped = envelop({
      plugins: [
        enginePlugin,
        useSchema(schema),
        useMock({
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
          baseDir,
          importFn,
        }),
      ],
    });
    const enveloped = getEnveloped();
    const ADD_USER = enveloped.parse(/* GraphQL */ `
      mutation AddUser {
        addUser(name: "John Doe") {
          id
          name
        }
      }
    `);
    const addUserResult: any = await enveloped.execute({
      schema: enveloped.schema,
      document: ADD_USER,
    });
    expect(addUserResult?.data?.addUser?.name).toBe('John Doe');
    const addedUserId = addUserResult.data.addUser.id;
    const GET_USER = enveloped.parse(/* GraphQL */ `
      query GetUser {
        user(id: "${addedUserId}") {
          id
          name
        }
      }
    `);
    const getUserResult: any = await enveloped.execute({
      schema: enveloped.schema,
      document: GET_USER,
    });
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
    const updateUserResult: any = await enveloped.execute({
      schema: enveloped.schema,
      document: UPDATE_USER,
    });
    expect(updateUserResult?.data?.updateUser?.id).toBe(addedUserId);
    expect(updateUserResult?.data?.updateUser?.name).toBe('Jane Doe');
  });
  describe('Documentation', () => {
    function initializeStore(mockStore: IMockStore) {
      const users = [{ id: 'uuid', name: 'John Snow' }];
      // Set individual users' data in the store so that they can be queried as individuals later on
      users.forEach(user => {
        mockStore.set('User', user.id, user);
      });

      // Populate the `users` query on the root with data
      mockStore.set('Query', 'ROOT', 'users', users);
    }
    const schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID
        name: String
      }
      type Query {
        user(id: ID): User
        users: [User]
        me: User
      }
      type Mutation {
        changeMyName(newName: String): User
        updateUser(id: ID, name: String): User
      }
    `);
    interface User {
      id: string;
      name: string;
    }
    it('works', async () => {
      const plugin = useMock({
        initializeStore,
        mocks: [
          {
            apply: 'Query.user',
            custom: (_, args, context) => context.mockStore.get('User', args.id),
          },
          {
            apply: 'Query.me',
            custom: (_, args, context) => context.mockStore.get('User', 'uuid'),
          },
          {
            apply: 'Mutation.changeMyName',
            custom: (_, args, context) => {
              const user = context.mockStore.get('User', 'uuid') as User;
              user.name = args.newName;
              context.mockStore.set('User', 'uuid', user);
              return user;
            },
          },
          {
            apply: 'Mutation.updateUser',
            custom: (_, args, context) => {
              const user = context.mockStore.get('User', args.id) as User;
              user.name = args.name;
              context.mockStore.set('User', args.id, user);
              return user;
            },
          },
        ],
      });
      const getEnveloped = envelop({
        plugins: [enginePlugin, useSchema(schema), plugin],
      });
      const enveloped = getEnveloped();

      // Query the `me` field to get the current user
      const meResult: any = await enveloped.execute({
        schema: enveloped.schema,
        document: enveloped.parse(/* GraphQL */ `
          {
            me {
              id
              name
            }
          }
        `),
        contextValue: await enveloped.contextFactory({}),
      });
      expect(meResult?.data?.me).toEqual({ id: 'uuid', name: 'John Snow' });
      // Change the current user's name
      const changeMyNameResult: any = await enveloped.execute({
        schema: enveloped.schema,
        document: enveloped.parse(/* GraphQL */ `
          mutation {
            changeMyName(newName: "Arya Stark") {
              id
              name
            }
          }
        `),
        contextValue: await enveloped.contextFactory({}),
      });
      expect(changeMyNameResult?.data?.changeMyName).toEqual({ id: 'uuid', name: 'Arya Stark' });
      // Update another user's name by their ID
      const updateUserResult: any = await enveloped.execute({
        schema: enveloped.schema,
        document: enveloped.parse(/* GraphQL */ `
          mutation {
            updateUser(id: "uuid", name: "Tyrion Lannister") {
              id
              name
            }
          }
        `),
        contextValue: await enveloped.contextFactory({}),
      });
      expect(updateUserResult?.data?.updateUser).toEqual({ id: 'uuid', name: 'Tyrion Lannister' });
      // Verify that the changes are reflected when querying `me` again
      const meResultAfterUpdates: any = await enveloped.execute({
        schema: enveloped.schema,
        document: enveloped.parse(/* GraphQL */ `
          {
            me {
              id
              name
            }
          }
        `),
        contextValue: await enveloped.contextFactory({}),
      });
      expect(meResultAfterUpdates?.data?.me).toEqual({ id: 'uuid', name: 'Tyrion Lannister' });
    });
  });
});
