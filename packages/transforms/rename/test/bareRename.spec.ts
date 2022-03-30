import RenameTransform from './../src/index';
import { buildSchema, GraphQLObjectType } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { ImportFn, MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';

describe('rename', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      my_user: MyUser!
      my_book: MyBook!
      profile(profile_id: ID!, role: String): Profile
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
  `);
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;
  const importFn: ImportFn = m => import(m);

  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should change the name of a type', () => {
    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);

    expect(newSchema.getType('MyUser')).toBeUndefined();
    expect(newSchema.getType('User')).toBeDefined();
  });

  it('should change the name of a field', () => {
    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_user).toBeUndefined();
    expect(fieldMap.user).toBeDefined();
  });

  it('should change the name of multiple type names', () => {
    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);

    expect(newSchema.getType('MyUser')).toBeUndefined();
    expect(newSchema.getType('User')).toBeDefined();
    expect(newSchema.getType('MyBook')).toBeUndefined();
    expect(newSchema.getType('Book')).toBeDefined();
  });

  it('should change the name of multiple fields', () => {
    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_user).toBeUndefined();
    expect(fieldMap.user).toBeDefined();
    expect(fieldMap.my_book).toBeUndefined();
    expect(fieldMap.book).toBeDefined();
  });

  it('should replace the first occurrence of a substring in a field', () => {
    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.my_book).toBeUndefined();
    expect(fieldMap.my_bok).toBeDefined();
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

    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);
    expect(newSchema.getType('ApiUserV1Api')).toBeUndefined();
    expect(newSchema.getType('UserV1')).toBeDefined();
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

    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);
    expect(newSchema.getType('ApiUserV1Api')).toBeUndefined();
    expect(newSchema.getType('User')).toBeDefined();
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

    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.api_user_v1_api).toBeUndefined();
    expect(fieldMap.user_v1).toBeDefined();
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

    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.api_user_v1_api).toBeUndefined();
    expect(fieldMap.user).toBeDefined();
  });

  it('should only affect specified type', () => {
    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);
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
  });

  it('should only affect specified field argument', () => {
    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      importFn,
    });

    const newSchema = transform.transformSchema(schema, {} as any);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeUndefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeDefined();
  });

  it('should only affect field argument only if type and field are specified', () => {
    const transform = new RenameTransform({
      config: {
        mode: 'bare',
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
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn: m => import(m),
    });

    const newSchema = transform.transformSchema(schema, {} as any);
    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    const fieldMap = queryType.getFields();

    expect(fieldMap.profile.args.find(a => a.name === 'role')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profile_id')).toBeDefined();
    expect(fieldMap.profile.args.find(a => a.name === 'profileId')).toBeUndefined();
  });
});
