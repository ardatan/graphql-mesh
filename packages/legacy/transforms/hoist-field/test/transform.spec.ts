import { buildSchema, GraphQLObjectType, printSchema, type GraphQLField } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import type { Logger, MeshPubSub } from '@graphql-mesh/types';
import { defaultImportFn, DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import HoistFieldTransform from '../src/index.js';

describe('hoist', () => {
  const logger: Logger = {
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: () => logger,
  };
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
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;

  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should hoist field with string pathConfig array', () => {
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
