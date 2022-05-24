import RenameTransform from './../src/index';
import { buildSchema, graphql, GraphQLObjectType, printSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { wrapSchema } from '@graphql-tools/wrap';

describe('rename', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        my_user: MyUser!
        my_book: MyBook!
        profile(profile_id: ID!, role: String, some_argument: String, another_argument: Int): Profile
      }

      type MyUser {
        id: ID!
      }

      type Profile {
        id: ID!
      }

      type MyBook {
        id: ID!
      }
    `,
    resolvers: {
      Query: { my_user: () => ({ id: 'userId' }), profile: (_, args) => ({ id: `profile_${args.profile_id}` }) },
    },
  });
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;

  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should change the name of a type', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            renames: [
              {
                from: {
                  type: 'MyUser',
                },
                to: {
                  type: 'User',
                },
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    expect(newSchema.getType('MyUser')).toBeUndefined();
    expect(newSchema.getType('User')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should change the name of a field', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            mode: 'wrap',
            renames: [
              {
                from: {
                  type: 'Query',
                  field: 'my_user',
                },
                to: {
                  type: 'Query',
                  field: 'user',
                },
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_user).toBeUndefined();
    expect(fieldMap.user).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should resolve correctly renamed field', async () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          config: {
            mode: 'wrap',
            renames: [
              {
                from: {
                  type: 'MyUser',
                  field: 'id',
                },
                to: {
                  type: 'MyUser',
                  field: 'userId',
                },
              },
            ],
          },
          apiName: '',
          cache,
          pubsub,
          baseDir,
          importFn: m => import(m),
        }),
      ],
    });

    const result = await graphql({
      schema: newSchema,
      source: /* GraphQL */ `
        {
          my_user {
            userId
          }
        }
      `,
    });

    expect(result.data).toMatchObject({ my_user: { userId: 'userId' } });
  });

  it('should change the name of multiple type names', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            mode: 'wrap',
            renames: [
              {
                from: {
                  type: 'My(.*)',
                },
                to: {
                  type: '$1',
                },
                useRegExpForTypes: true,
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    expect(newSchema.getType('MyUser')).toBeUndefined();
    expect(newSchema.getType('User')).toBeDefined();
    expect(newSchema.getType('MyBook')).toBeUndefined();
    expect(newSchema.getType('Book')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should change the name of multiple fields', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            renames: [
              {
                from: {
                  type: 'Query',
                  field: 'my_(.*)',
                },
                to: {
                  type: 'Query',
                  field: '$1',
                },
                useRegExpForFields: true,
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_user).toBeUndefined();
    expect(fieldMap.user).toBeDefined();
    expect(fieldMap.my_book).toBeUndefined();
    expect(fieldMap.book).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should replace the first occurrence of a substring in a field', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            mode: 'wrap',
            renames: [
              {
                from: {
                  type: 'Query',
                  field: 'o(.*)',
                },
                to: {
                  type: 'Query',
                  field: '$1',
                },
                useRegExpForFields: true,
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_book).toBeUndefined();
    expect(fieldMap.my_bok).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should replace all occurrences of a substring in a type', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        api_user_v1_api: ApiUserV1Api!
      }

      type ApiUserV1Api {
        id: ID!
      }
    `);

    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            renames: [
              {
                from: {
                  type: 'Api(.*?)',
                },
                to: {
                  type: '$1',
                },
                useRegExpForTypes: true,
                regExpFlags: 'g',
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    expect(newSchema.getType('ApiUserV1Api')).toBeUndefined();
    expect(newSchema.getType('UserV1')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should replace all occurrences of multiple substrings in a type', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        api_user_v1_api: ApiUserV1Api!
      }

      type ApiUserV1Api {
        id: ID!
      }
    `);

    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            renames: [
              {
                from: {
                  type: 'Api|V1(.*?)',
                },
                to: {
                  type: '$1',
                },
                useRegExpForTypes: true,
                regExpFlags: 'g',
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    expect(newSchema.getType('ApiUserV1Api')).toBeUndefined();
    expect(newSchema.getType('User')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should replace all occurrences of a substring in a field', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        api_user_v1_api: ApiUserV1Api!
      }

      type ApiUserV1Api {
        id: ID!
      }
    `);

    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            renames: [
              {
                from: {
                  type: 'Query',
                  field: 'api_|_api(.*?)',
                },
                to: {
                  type: 'Query',
                  field: '$1',
                },
                useRegExpForFields: true,
                regExpFlags: 'g',
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.api_user_v1_api).toBeUndefined();
    expect(fieldMap.user_v1).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should replace all occurrences of multiple substrings in a field', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        api_user_v1_api: ApiUserV1Api!
      }

      type ApiUserV1Api {
        id: ID!
      }
    `);

    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            renames: [
              {
                from: {
                  type: 'Query',
                  field: 'api_|_api|v1_|_v1(.*?)',
                },
                to: {
                  type: 'Query',
                  field: '$1',
                },
                useRegExpForFields: true,
                regExpFlags: 'g',
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.api_user_v1_api).toBeUndefined();
    expect(fieldMap.user).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should only affect specified type', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            mode: 'wrap',
            renames: [
              {
                from: {
                  type: 'Query',
                  field: 'o(.*)',
                },
                to: {
                  type: 'Query',
                  field: '$1',
                },
                useRegExpForFields: true,
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_book).toBeUndefined();
    expect(fieldMap.my_bok).toBeDefined();

    const myUserType = newSchema.getType('MyUser') as GraphQLObjectType;
    const myUserFields = myUserType.getFields();

    expect(myUserFields.id).toBeDefined();

    const myBookType = newSchema.getType('MyBook') as GraphQLObjectType;
    const myBookFields = myBookType.getFields();

    expect(myBookFields.id).toBeDefined();

    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should only affect specified field argument', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            mode: 'wrap',
            renames: [
              {
                from: {
                  type: 'Query',
                  field: 'profile',
                  argument: 'profile_id',
                },
                to: {
                  type: 'Query',
                  field: 'profile',
                  argument: 'profileId',
                },
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    // TODO: uncomment following line once #3778 is fixed
    // expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeUndefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeDefined();

    expect(fieldMap.profile.args.find(a => a.name === 'another_argument')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'some_argument')).toBeDefined();

    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should only affect specified field match argument', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            mode: 'wrap',
            renames: [
              {
                from: {
                  type: 'Query',
                  field: 'profile',
                  argument: '(profile)_(id)',
                },
                to: {
                  type: 'Query',
                  field: 'profile',
                  argument: '$1Id',
                },
                useRegExpForArguments: true,
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    // TODO: uncomment following line once #3778 is fixed
    // expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeUndefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeDefined();

    expect(fieldMap.profile.args.find(a => a.name === 'another_argument')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'some_argument')).toBeDefined();

    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should only affect specified match type and match field argument', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            mode: 'wrap',
            renames: [
              {
                from: {
                  type: '(.uer.)',
                  field: '(.rofil.)',
                  argument: 'profile_id',
                },
                to: {
                  type: '$1',
                  field: '$1',
                  argument: 'profileId',
                },
                useRegExpForTypes: true,
                useRegExpForFields: true,
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    // TODO: uncomment following line once #3778 is fixed
    // expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeUndefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeDefined();

    expect(fieldMap.profile.args.find(a => a.name === 'another_argument')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'some_argument')).toBeDefined();

    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should resolve correctly field with renamed argument', async () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          config: {
            mode: 'wrap',
            renames: [
              {
                from: {
                  type: 'Query',
                  field: 'profile',
                  argument: 'profile_id',
                },
                to: {
                  type: 'Query',
                  field: 'profile',
                  argument: 'profileId',
                },
              },
            ],
          },
          apiName: '',
          cache,
          pubsub,
          baseDir,
          importFn: m => import(m),
        }),
      ],
    });

    const result = await graphql({
      schema: newSchema,
      source: /* GraphQL */ `
        {
          profile(profileId: "abc123") {
            id
          }
        }
      `,
    });

    expect(result.data).toMatchObject({ profile: { id: 'profile_abc123' } });
  });

  it('should only affect field argument only if type and field are specified', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new RenameTransform({
          apiName: '',
          importFn: m => import(m),
          config: {
            mode: 'wrap',
            renames: [
              {
                from: {
                  argument: 'profile_id',
                },
                to: {
                  argument: 'profileId',
                },
              },
            ],
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeUndefined();

    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  // TODO
  it.skip('should move a root field from a root type to another', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String
      }

      type Mutation {
        bar: String
      }
    `);

    const transform = new RenameTransform({
      apiName: '',
      importFn: m => import(m),
      config: {
        mode: 'bare',
        renames: [
          {
            from: {
              type: 'Mutation',
              field: 'bar',
            },
            to: {
              type: 'Query',
              field: 'bar',
            },
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
    });

    const newSchema = transform.transformSchema(schema, {} as any);

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const queryFieldMap = queryType.getFields();

    expect(queryFieldMap.bar).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });
});
