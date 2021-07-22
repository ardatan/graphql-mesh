import RenameTransform from './../src/index';
import { buildSchema, GraphQLObjectType, printSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';
import { wrapSchema } from '@graphql-tools/wrap';

describe('rename', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      my_user: MyUser!
      my_book: MyBook!
    }

    type MyUser {
      id: ID!
    }

    type MyBook {
      id: ID!
    }
  `);
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
        RenameTransform({
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
        RenameTransform({
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

  it('should change the name of multiple type names', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        RenameTransform({
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
        RenameTransform({
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
        RenameTransform({
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
        RenameTransform({
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
        RenameTransform({
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
        RenameTransform({
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
        RenameTransform({
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
});
