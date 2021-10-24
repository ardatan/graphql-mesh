import { join } from 'path';
import { execute, parse, printSchema, GraphQLObjectType } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';

import TransferFieldTransform from '../src/bareTransferField';

describe('transform-field', () => {
  const mockQueryBooks = jest.fn().mockImplementation(() => ({ books: [{ title: 'abc' }, { title: 'def' }] }));
  const mockBooksApiResponseBooks = jest.fn().mockImplementation(() => [{ title: 'ghi' }, { title: 'lmn' }]);

  const schemaDefs = /* GraphQL */ `
    type Query {
      dummy: String
    }

    type Mutation {
      """
      Retrieve a list of Books
      """
      books(maxResults: Int, orderBy: String): [Book]
    }

    type Book {
      title: String!
      author: Author!
      code: String
    }

    type Author {
      name: String!
      age: Int!
    }
  `;
  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should move field to different type - no regex', async () => {
    const transform = new TransferFieldTransform({
      config: {
        mode: 'bare',
        fields: [
          {
            from: {
              type: 'Mutation',
              field: 'books',
            },
            to: {
              type: 'Query',
              field: 'books',
            },
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      syncImportFn: require,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(transformedSchema.getType('Mutation')).toBeUndefined();
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString()).toBe('[Book]');
    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });

  it('should move field to different type - regex', async () => {
    const transform = new TransferFieldTransform({
      config: {
        mode: 'bare',
        fields: [
          {
            from: {
              type: 'Mutation',
              field: '(.*)',
            },
            to: {
              type: 'Query',
              field: '$1',
            },
            useRegExp: true,
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      syncImportFn: require,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(transformedSchema.getType('Mutation')).toBeUndefined();
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString()).toBe('[Book]');
    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });

  it('should copy field to different type - regex', async () => {
    const transform = new TransferFieldTransform({
      config: {
        mode: 'bare',
        fields: [
          {
            from: {
              type: 'Mutation',
              field: '(.*)',
            },
            to: {
              type: 'Query',
              field: '$1',
            },
            useRegExp: true,
            action: 'copy',
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      syncImportFn: require,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(transformedSchema.getType('Mutation')).toBeDefined();
    expect((transformedSchema.getType('Mutation') as GraphQLObjectType).getFields().books.type.toString()).toBe(
      '[Book]'
    );
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString()).toBe('[Book]');
    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });
});
