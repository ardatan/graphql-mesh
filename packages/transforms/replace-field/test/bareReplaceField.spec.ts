import { join } from 'path';
import { execute, parse, printSchema, GraphQLObjectType } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';

import ReplaceFieldTransform from '../src';

describe('replace-field', () => {
  const schemaDefs = /* GraphQL */ `
    type Query {
      books: BooksApiResponse
    }

    type BooksApiResponse {
      books: [Books]
    }

    type Books {
      title: String!
      author: Author!
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
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should replace correctly field with resolver function', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
        mode: 'bare',
        replacements: [
          {
            from: {
              type: 'Query',
              field: 'books',
            },
            to: {
              type: 'BooksApiResponse',
              field: 'books',
            },
            scope: 'hoistValue',
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
      resolvers: {
        Query: {
          books: () => ({
            books: [{ title: 'abc' }, { title: 'def' }],
          }),
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(transformedSchema.getType('BooksApiResponse')).toBeUndefined();
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString()).toBe('[Books]');
    expect(printSchema(transformedSchema)).toMatchSnapshot();

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            title
          }
        }
      `),
    });
    expect(result.data.books).toEqual([{ title: 'abc' }, { title: 'def' }]);
  });

  it('should replace correctly field without resolver function', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
        mode: 'bare',
        replacements: [
          {
            from: {
              type: 'Books',
              field: 'author',
            },
            to: {
              type: 'Author',
              field: 'name',
            },
            scope: 'hoistValue',
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
      resolvers: {
        Query: {
          books: () => ({
            books: [
              { title: 'abc', author: { name: 'abra' } },
              { title: 'def', author: { name: 'cadabra' } },
            ],
          }),
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(transformedSchema.getType('Author')).toBeUndefined();
    expect((transformedSchema.getType('Books') as GraphQLObjectType).getFields().author.type.toString()).toBe(
      'String!'
    );
    expect(printSchema(transformedSchema)).toMatchSnapshot();

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            books {
              title
              author
            }
          }
        }
      `),
    });
    expect(result.data.books.books).toEqual([
      { title: 'abc', author: 'abra' },
      { title: 'def', author: 'cadabra' },
    ]);
  });

  it('should replace correctly mtultiple fields with and without resolver function', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
        mode: 'bare',
        replacements: [
          {
            from: {
              type: 'Query',
              field: 'books',
            },
            to: {
              type: 'BooksApiResponse',
              field: 'books',
            },
            scope: 'hoistValue',
          },
          {
            from: {
              type: 'Books',
              field: 'author',
            },
            to: {
              type: 'Author',
              field: 'name',
            },
            scope: 'hoistValue',
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
      resolvers: {
        Query: {
          books: () => ({
            books: [
              { title: 'abc', author: { name: 'abra' } },
              { title: 'def', author: { name: 'cadabra' } },
            ],
          }),
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(transformedSchema.getType('BooksApiResponse')).toBeUndefined();
    expect(transformedSchema.getType('Author')).toBeUndefined();
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString()).toBe('[Books]');
    expect((transformedSchema.getType('Books') as GraphQLObjectType).getFields().author.type.toString()).toBe(
      'String!'
    );
    expect(printSchema(transformedSchema)).toMatchSnapshot();

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            title
            author
          }
        }
      `),
    });
    expect(result.data.books).toEqual([
      { title: 'abc', author: 'abra' },
      { title: 'def', author: 'cadabra' },
    ]);
  });

  it('should replace correctly field Type with additional type definitions', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
        mode: 'bare',
        typeDefs: /* GraphQL */ `
          type NewAuthor {
            age: String
          }
        `,
        replacements: [
          {
            from: {
              type: 'Query',
              field: 'books',
            },
            to: {
              type: 'BooksApiResponse',
              field: 'books',
            },
            scope: 'hoistValue',
          },
          {
            from: {
              type: 'Author',
              field: 'age',
            },
            to: {
              type: 'NewAuthor',
              field: 'age',
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
      resolvers: {
        Query: {
          books: () => ({
            books: [
              { title: 'abc', author: { age: 50 } },
              { title: 'def', author: {} },
            ],
          }),
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);

    expect((transformedSchema.getType('Author') as GraphQLObjectType).getFields().age.type.toString()).toBe('String');
    expect(printSchema(transformedSchema)).toMatchSnapshot();

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            title
            author {
              age
            }
          }
        }
      `),
    });
    expect(result.data.books).toEqual([
      { title: 'abc', author: { age: '50' } },
      { title: 'def', author: { age: null } },
    ]);
  });

  it('should replace correctly field with composer wrapping resolver function', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
        mode: 'bare',
        replacements: [
          {
            from: {
              type: 'Query',
              field: 'books',
            },
            to: {
              type: 'BooksApiResponse',
              field: 'books',
            },
            composer: join(__dirname, './fixtures/composer.js#books'),
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
      resolvers: {
        Query: {
          books: () => ({
            availableBooks: [{ title: 'abc' }, { title: 'def' }],
          }),
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            title
          }
        }
      `),
    });
    expect(result.data.books).toEqual([{ title: 'abc' }, { title: 'def' }]);
  });
});
