import { buildSchema, GraphQLObjectType, printSchema, type GraphQLField } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import type { Logger, MeshPubSub } from '@graphql-mesh/types';
import { defaultImportFn, PubSub } from '@graphql-mesh/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import { dummyLogger as logger } from '../../../../testing/dummyLogger';
import HoistFieldTransform from '../src/index.js';

describe('hoist', () => {
  const importFn = defaultImportFn;
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      users(limit: Int!, page: Int): UserSearchResult
    }

    type UserSearchResult {
      page: Int!
      results: [User!]!
    }

    type User {
      id: ID!
      name: String!
    }
  `);
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;

  beforeEach(() => {
    pubsub = new PubSub();
  });

  it('should hoist field with string pathConfig array', () => {
    using cache = new InMemoryLRUCache();
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new HoistFieldTransform({
          config: [
            {
              typeName: 'Query',
              pathConfig: ['users', 'results'],
              newFieldName: 'users',
            },
          ],
          apiName: '',
          cache,
          pubsub,
          baseDir,
          importFn,

          logger,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users(limit: Int!, page: Int): [User!]!
}

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });

  it('should hoist field with mixed pathConfig array', () => {
    using cache = new InMemoryLRUCache();
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new HoistFieldTransform({
          config: [
            {
              typeName: 'Query',
              pathConfig: [
                {
                  fieldName: 'users',
                  filterArgs: [],
                },
                'results',
              ],
              newFieldName: 'users',
            },
          ],
          apiName: '',
          cache,
          pubsub,
          baseDir,
          importFn,

          logger,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users(limit: Int!, page: Int): [User!]!
}

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });

  it('should hoist field and filter args with global flag', () => {
    using cache = new InMemoryLRUCache();
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new HoistFieldTransform({
          config: [
            {
              typeName: 'Query',
              pathConfig: ['users', 'results'],
              newFieldName: 'users',
              filterArgsInPath: true,
            },
          ],
          apiName: '',
          cache,
          pubsub,
          baseDir,
          importFn,

          logger,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    const args = (fields.users as GraphQLField<any, any>).args;
    expect(args.length).toEqual(0);

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users: [User!]!
}

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });

  it('should hoist field and filter individual args via pathConfig', () => {
    using cache = new InMemoryLRUCache();
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new HoistFieldTransform({
          config: [
            {
              typeName: 'Query',
              pathConfig: [
                {
                  fieldName: 'users',
                  filterArgs: ['limit'],
                },
                'results',
              ],
              newFieldName: 'users',
            },
          ],
          apiName: '',
          cache,
          pubsub,
          baseDir,
          importFn,

          logger,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    const args = (fields.users as GraphQLField<any, any>).args;
    expect(args.length).toEqual(1);
    expect(args[0].name).toEqual('page');

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users(page: Int): [User!]!
}

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });

  it('should hoist field and filter individual args via pathConfig independent of global flag', () => {
    using cache = new InMemoryLRUCache();
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new HoistFieldTransform({
          config: [
            {
              typeName: 'Query',
              pathConfig: [
                {
                  fieldName: 'users',
                  filterArgs: ['limit'],
                },
                'results',
              ],
              newFieldName: 'users',
              filterArgsInPath: true,
            },
          ],
          apiName: '',
          cache,
          pubsub,
          baseDir,
          importFn,

          logger,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    const args = (fields.users as GraphQLField<any, any>).args;
    expect(args.length).toEqual(1);
    expect(args[0].name).toEqual('page');

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users(page: Int): [User!]!
}

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });
  it('should respect the new field name', () => {
    using cache = new InMemoryLRUCache();
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new HoistFieldTransform({
          config: [
            {
              typeName: 'Query',
              pathConfig: ['users', 'results'],
              newFieldName: 'usersResults',
            },
          ],
          apiName: '',
          cache,
          pubsub,
          baseDir,
          importFn,

          logger,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.usersResults).toBeDefined();

    expect(printSchema(newSchema)).toMatchInlineSnapshot(`
"type Query {
  users(limit: Int!, page: Int): UserSearchResult
  usersResults(limit: Int!, page: Int): [User!]!
}

type UserSearchResult {
  page: Int!
}

type User {
  id: ID!
  name: String!
}"
`);
  });
});
