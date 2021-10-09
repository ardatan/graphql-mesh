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
      books: [Book]
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
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should replace correctly field Type only', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
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
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString()).toBe('[Book]');
    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });

  it('should replace correctly field Type with additional type definitions', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
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

  it('should replace correctly field with hoistValue and resolver function', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
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
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString()).toBe('[Book]');

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

  it('should replace correctly field with hoistValue and default-field-resolver', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
        replacements: [
          {
            from: {
              type: 'Book',
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
    expect((transformedSchema.getType('Book') as GraphQLObjectType).getFields().author.type.toString()).toBe('String!');

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

  it('should replace correctly mtultiple fields with hoistValue and defined resolver function as well as default-field-resolver', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
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
              type: 'Book',
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
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString()).toBe('[Book]');
    expect((transformedSchema.getType('Book') as GraphQLObjectType).getFields().author.type.toString()).toBe('String!');
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

  it('should replace correctly field with composer wrapping resolver function', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
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
            isAvailable
          }
        }
      `),
    });
    expect(result.data.books).toEqual([{ title: 'abc' }, { title: 'def' }]);
  });

  it('should replace correctly field with composer wrapping default-field-resolver', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
        typeDefs: /* GraphQL */ `
          type NewBook {
            code: String!
          }
        `,
        replacements: [
          {
            from: {
              type: 'Book',
              field: 'code',
            },
            to: {
              type: 'NewBook',
              field: 'code',
            },
            composer: join(__dirname, './fixtures/composer.js#code'),
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
              { title: 'abc', code: 'def' },
              { title: 'ghi', code: 'lmn' },
            ],
          }),
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);

    expect((transformedSchema.getType('Book') as GraphQLObjectType).getFields().code.type.toString()).toBe('String!');

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            books {
              title
              code
            }
          }
        }
      `),
    });
    expect(result.data.books.books).toEqual([
      { title: 'abc', code: 'store001_def' },
      { title: 'ghi', code: 'store001_lmn' },
    ]);
  });

  it('should replace correctly renamed field with Type only', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
        typeDefs: /* GraphQL */ `
          type NewAuthor {
            name: String
          }
        `,
        replacements: [
          {
            from: {
              type: 'Author',
              field: 'name',
            },
            to: {
              type: 'NewAuthor',
              field: 'name',
            },
            name: 'fullName',
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
              { title: 'abc', author: { name: 'def' } },
              { title: 'ghi', author: { name: 'lmn' } },
            ],
          }),
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);

    expect((transformedSchema.getType('Author') as GraphQLObjectType).getFields().name).toBeUndefined();
    expect((transformedSchema.getType('Author') as GraphQLObjectType).getFields().fullName.type.toString()).toBe(
      'String'
    );

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            books {
              title
              author {
                fullName
              }
            }
          }
        }
      `),
    });
    expect(result.data.books.books).toEqual([
      { title: 'abc', author: { fullName: 'def' } },
      { title: 'ghi', author: { fullName: 'lmn' } },
    ]);
  });

  it('should replace correctly renamed field with hoistValue and resolver function', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
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
            name: 'ourBooks',
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
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().books).toBeUndefined();
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().ourBooks.type.toString()).toBe(
      '[Book]'
    );

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          ourBooks {
            title
          }
        }
      `),
    });
    expect(result.data.ourBooks).toEqual([{ title: 'abc' }, { title: 'def' }]);
  });

  it('should replace correctly renamed field with hoistValue and default-field-resolver', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
        replacements: [
          {
            from: {
              type: 'Book',
              field: 'author',
            },
            to: {
              type: 'Author',
              field: 'name',
            },
            name: 'authorName',
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
    expect((transformedSchema.getType('Book') as GraphQLObjectType).getFields().author).toBeUndefined();
    expect((transformedSchema.getType('Book') as GraphQLObjectType).getFields().authorName.type.toString()).toBe(
      'String!'
    );

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            books {
              title
              authorName
            }
          }
        }
      `),
    });
    expect(result.data.books.books).toEqual([
      { title: 'abc', authorName: 'abra' },
      { title: 'def', authorName: 'cadabra' },
    ]);
  });

  it('should replace correctly renamed field with composer wrapping resolver function', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
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
            name: 'ourBooks',
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

    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().books).toBeUndefined();
    expect((transformedSchema.getType('Query') as GraphQLObjectType).getFields().ourBooks.type.toString()).toBe(
      '[Book]'
    );

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          ourBooks {
            title
            isAvailable
          }
        }
      `),
    });
    expect(result.data.ourBooks).toEqual([{ title: 'abc' }, { title: 'def' }]);
  });

  it('should replace correctly renamed field with composer wrapping default-field-resolver', async () => {
    const transform = new ReplaceFieldTransform({
      config: {
        typeDefs: /* GraphQL */ `
          type NewBook {
            isAvailable: Boolean
          }
        `,
        replacements: [
          {
            from: {
              type: 'Book',
              field: 'code',
            },
            to: {
              type: 'NewBook',
              field: 'isAvailable',
            },
            name: 'isAvailable',
            composer: join(__dirname, './fixtures/composer.js#isAvailable'),
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
              { title: 'abc', code: undefined },
              { title: 'def', code: 'ghi' },
            ],
          }),
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);

    expect((transformedSchema.getType('Book') as GraphQLObjectType).getFields().code).toBeUndefined();
    expect((transformedSchema.getType('Book') as GraphQLObjectType).getFields().isAvailable.type.toString()).toBe(
      'Boolean'
    );

    const result = await execute({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            books {
              title
              isAvailable
            }
          }
        }
      `),
    });
    expect(result.data.books.books).toEqual([
      { title: 'abc', isAvailable: false },
      { title: 'def', isAvailable: true },
    ]);
  });

  it('applies multiple replaces to obtain a cleaner schema', () => {
    const transform = new ReplaceFieldTransform({
      config: {
        typeDefs: /* GraphQL */ `
          type NewBook {
            isAvailable: Boolean
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
          },
          {
            from: {
              type: 'Book',
              field: 'code',
            },
            to: {
              type: 'NewBook',
              field: 'isAvailable',
            },
            name: 'isAvailable',
            composer: join(__dirname, './fixtures/composer.js#isAvailable'),
          },
          {
            from: {
              type: 'Book',
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
            books: [{ title: 'abc' }, { title: 'def' }],
          }),
        },
      },
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(transformedSchema.getType('BooksApiResponse')).toBeUndefined();
    expect((transformedSchema.getType('Book') as GraphQLObjectType).getFields().code).toBeUndefined();
    expect((transformedSchema.getType('Book') as GraphQLObjectType).getFields().isAvailable.type.toString()).toBe(
      'Boolean'
    );
    expect(transformedSchema.getType('Author')).toBeUndefined();
    expect((transformedSchema.getType('Book') as GraphQLObjectType).getFields().author.type.toString()).toBe('String!');

    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });
});
