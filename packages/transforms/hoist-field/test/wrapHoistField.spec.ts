import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { wrapSchema } from '@graphql-tools/wrap';
import { buildSchema, GraphQLField, GraphQLObjectType, printSchema } from 'graphql';
import { PubSub } from 'graphql-subscriptions';

import HoistFieldTransform from './../src';

describe('hoist', () => {
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
          apiName: '',
          syncImportFn: require,
          config: [
            {
              typeName: 'Query',
              pathConfig: ['users', 'results'],
              newFieldName: 'users',
            },
          ],
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should hoist field with mixed pathConfig array', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new HoistFieldTransform({
          apiName: '',
          syncImportFn: require,
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
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should hoist field and filter args with global flag', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new HoistFieldTransform({
          apiName: '',
          syncImportFn: require,
          config: [
            {
              typeName: 'Query',
              pathConfig: ['users', 'results'],
              newFieldName: 'users',
              filterArgsInPath: true,
            },
          ],
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

    const queryType = newSchema.getType('Query') as GraphQLObjectType;
    expect(queryType).toBeDefined();

    const fields = queryType.getFields();
    expect(fields.users).toBeDefined();

    const args = (fields.users as GraphQLField<any, any>).args;
    expect(args.length).toEqual(0);

    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should hoist field and filter individual args via pathConfig', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new HoistFieldTransform({
          apiName: '',
          syncImportFn: require,
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
          cache,
          pubsub,
          baseDir,
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

    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should hoist field and filter individual args via pathConfig independent of global flag', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new HoistFieldTransform({
          apiName: '',
          syncImportFn: require,
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
          cache,
          pubsub,
          baseDir,
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

    expect(printSchema(newSchema)).toMatchSnapshot();
  });
});
