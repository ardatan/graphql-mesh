import { join } from 'path';
import { GraphQLObjectType, parse, printSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import type { ImportFn, Logger, MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { normalizedExecutor } from '@graphql-tools/executor';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isAsyncIterable, pruneSchema } from '@graphql-tools/utils';
import { dummyLogger as logger } from '../../../../testing/dummyLogger';
import ReplaceFieldTransform from '../src/index.js';

const importFn: ImportFn = m =>
  import(m).catch(e => {
    console.error(`Import failed;`, e);
    throw e;
  });

describe('replace-field', () => {
  const mockQueryBooks = jest
    .fn()
    .mockImplementation(() => ({ books: [{ title: 'abc' }, { title: 'def' }] }));
  const mockBooksApiResponseBooks = jest
    .fn()
    .mockImplementation(() => [{ title: 'ghi' }, { title: 'lmn' }]);

  const schemaDefs = /* GraphQL */ `
    type Query {
      books: BooksApiResponse
    }

    type BooksApiResponse {
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
  using cache = new InMemoryLRUCache();
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(transformedSchema.getType('BooksApiResponse')).toBeUndefined();
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString(),
    ).toBe('[Book]');
    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });

  it('should replace correctly field Type with additional type definitions', async () => {
    mockQueryBooks.mockReturnValueOnce({
      books: [
        { title: 'abc', author: { age: 50 } },
        { title: 'def', author: {} },
      ],
    });

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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
        BooksApiResponse: {
          books: mockBooksApiResponseBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(
      (transformedSchema.getType('Author') as GraphQLObjectType).getFields().age.type.toString(),
    ).toBe('String');
    expect(printSchema(transformedSchema)).toMatchSnapshot();

    const result = await normalizedExecutor({
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
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(mockQueryBooks).toHaveBeenCalledTimes(1);
    expect(mockBooksApiResponseBooks).not.toHaveBeenCalled();
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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
        BooksApiResponse: {
          books: mockBooksApiResponseBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(transformedSchema.getType('BooksApiResponse')).toBeUndefined();
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString(),
    ).toBe('[Book]');

    const result = await normalizedExecutor({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            title
          }
        }
      `),
    });
    expect(mockQueryBooks).toHaveBeenCalledTimes(1);
    expect(mockBooksApiResponseBooks).not.toHaveBeenCalled();
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(result.data.books).toEqual([{ title: 'abc' }, { title: 'def' }]);
  });

  it('should replace correctly field with hoistValue and default-field-resolver', async () => {
    mockQueryBooks.mockReturnValueOnce({
      books: [
        { title: 'abc', author: { name: 'abra' } },
        { title: 'def', author: { name: 'cadabra' } },
      ],
    });

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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(transformedSchema.getType('Author')).toBeUndefined();
    expect(
      (transformedSchema.getType('Book') as GraphQLObjectType).getFields().author.type.toString(),
    ).toBe('String!');

    const result = await normalizedExecutor({
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
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(result.data.books.books).toEqual([
      { title: 'abc', author: 'abra' },
      { title: 'def', author: 'cadabra' },
    ]);
  });

  it('should replace correctly mtultiple fields with hoistValue and defined resolver function as well as default-field-resolver', async () => {
    mockQueryBooks.mockReturnValueOnce({
      books: [
        { title: 'abc', author: { name: 'abra' } },
        { title: 'def', author: { name: 'cadabra' } },
      ],
    });

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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
        BooksApiResponse: {
          books: mockBooksApiResponseBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(transformedSchema.getType('BooksApiResponse')).toBeUndefined();
    expect(transformedSchema.getType('Author')).toBeUndefined();
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString(),
    ).toBe('[Book]');
    expect(
      (transformedSchema.getType('Book') as GraphQLObjectType).getFields().author.type.toString(),
    ).toBe('String!');
    expect(printSchema(transformedSchema)).toMatchSnapshot();

    const result = await normalizedExecutor({
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
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(mockQueryBooks).toHaveBeenCalledTimes(1);
    expect(mockBooksApiResponseBooks).not.toHaveBeenCalled();
    expect(result.data.books).toEqual([
      { title: 'abc', author: 'abra' },
      { title: 'def', author: 'cadabra' },
    ]);
  });

  it('should replace correctly field with composer wrapping resolver function', async () => {
    mockQueryBooks.mockReturnValueOnce({
      availableBooks: [{ title: 'abc' }, { title: 'def' }],
    });

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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
        BooksApiResponse: {
          books: mockBooksApiResponseBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    const result = await normalizedExecutor({
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
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(mockQueryBooks).toHaveBeenCalledTimes(1);
    expect(mockBooksApiResponseBooks).not.toHaveBeenCalled();
    expect(result.data.books).toEqual([{ title: 'abc' }, { title: 'def' }]);
  });

  it('should replace correctly field with composer wrapping default-field-resolver', async () => {
    mockQueryBooks.mockReturnValueOnce({
      books: [
        { title: 'abc', code: 'def' },
        { title: 'ghi', code: 'lmn' },
      ],
    });

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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(
      (transformedSchema.getType('Book') as GraphQLObjectType).getFields().code.type.toString(),
    ).toBe('String!');

    const result = await normalizedExecutor({
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
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(result.data.books.books).toEqual([
      { title: 'abc', code: 'store001_def' },
      { title: 'ghi', code: 'store001_lmn' },
    ]);
  });

  it('should replace correctly renamed field with Type only', async () => {
    mockQueryBooks.mockReturnValueOnce({
      books: [
        { title: 'abc', author: { name: 'abra' } },
        { title: 'def', author: { name: 'cadabra' } },
      ],
    });

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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(
      (transformedSchema.getType('Author') as GraphQLObjectType).getFields().name,
    ).toBeUndefined();
    expect(
      (transformedSchema.getType('Author') as GraphQLObjectType)
        .getFields()
        .fullName.type.toString(),
    ).toBe('String');

    const result = await normalizedExecutor({
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
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(result.data.books.books).toEqual([
      { title: 'abc', author: { fullName: 'abra' } },
      { title: 'def', author: { fullName: 'cadabra' } },
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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
        BooksApiResponse: {
          books: mockBooksApiResponseBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(transformedSchema.getType('BooksApiResponse')).toBeUndefined();
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books,
    ).toBeUndefined();
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType)
        .getFields()
        .ourBooks.type.toString(),
    ).toBe('[Book]');

    const result = await normalizedExecutor({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          ourBooks {
            title
          }
        }
      `),
    });
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(mockQueryBooks).toHaveBeenCalledTimes(1);
    expect(mockBooksApiResponseBooks).not.toHaveBeenCalled();
    expect(result.data.ourBooks).toEqual([{ title: 'abc' }, { title: 'def' }]);
  });

  it('should replace correctly renamed field with hoistValue and default-field-resolver', async () => {
    mockQueryBooks.mockReturnValueOnce({
      books: [
        { title: 'abc', author: { name: 'abra' } },
        { title: 'def', author: { name: 'cadabra' } },
      ],
    });

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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(transformedSchema.getType('Author')).toBeUndefined();
    expect(
      (transformedSchema.getType('Book') as GraphQLObjectType).getFields().author,
    ).toBeUndefined();
    expect(
      (transformedSchema.getType('Book') as GraphQLObjectType)
        .getFields()
        .authorName.type.toString(),
    ).toBe('String!');

    const result = await normalizedExecutor({
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
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(result.data.books.books).toEqual([
      { title: 'abc', authorName: 'abra' },
      { title: 'def', authorName: 'cadabra' },
    ]);
  });

  it('should replace correctly renamed field with composer wrapping resolver function', async () => {
    mockQueryBooks.mockReturnValueOnce({
      availableBooks: [{ title: 'abc' }, { title: 'def' }],
    });

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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
        BooksApiResponse: {
          books: mockBooksApiResponseBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books,
    ).toBeUndefined();
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType)
        .getFields()
        .ourBooks.type.toString(),
    ).toBe('[Book]');

    const result = await normalizedExecutor({
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
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(mockQueryBooks).toHaveBeenCalledTimes(1);
    expect(mockBooksApiResponseBooks).not.toHaveBeenCalled();
    expect(result.data.ourBooks).toEqual([{ title: 'abc' }, { title: 'def' }]);
  });

  it('should replace correctly renamed field with composer wrapping default-field-resolver', async () => {
    mockQueryBooks.mockReturnValueOnce({
      books: [
        { title: 'abc', code: undefined },
        { title: 'def', code: 'ghi' },
      ],
    });

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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: {
          books: mockQueryBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(
      (transformedSchema.getType('Book') as GraphQLObjectType).getFields().code,
    ).toBeUndefined();
    expect(
      (transformedSchema.getType('Book') as GraphQLObjectType)
        .getFields()
        .isAvailable.type.toString(),
    ).toBe('Boolean');

    const result = await normalizedExecutor({
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
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(result.data.books.books).toEqual([
      { title: 'abc', isAvailable: false },
      { title: 'def', isAvailable: true },
    ]);
  });

  it('should replace correctly whole field config', async () => {
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
            scope: 'config',
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
      resolvers: {
        Query: { books: mockQueryBooks },
        BooksApiResponse: {
          books: mockBooksApiResponseBooks,
        },
      },
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));
    const queryBooks = (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books;

    expect(printSchema(transformedSchema)).toMatchSnapshot();

    expect(transformedSchema.getType('BooksApiResponse')).toBeUndefined();
    expect(queryBooks.type.toString()).toBe('[Book]');
    expect(queryBooks.description).toBe('Retrieve a list of Books');
    expect(queryBooks.args).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'maxResults' }),
        expect.objectContaining({ name: 'orderBy' }),
      ]),
    );

    expect(mockBooksApiResponseBooks).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await queryBooks.resolve();
    expect(mockBooksApiResponseBooks).toHaveBeenCalledTimes(1);

    const result = await normalizedExecutor({
      schema: transformedSchema,
      document: parse(/* GraphQL */ `
        {
          books {
            title
          }
        }
      `),
    });
    if (isAsyncIterable(result)) {
      throw new Error('Result should not be an async iterable');
    }
    expect(mockQueryBooks).not.toHaveBeenCalled();
    expect(mockBooksApiResponseBooks).toHaveBeenCalledTimes(2);
    expect(result.data.books).toEqual([{ title: 'ghi' }, { title: 'lmn' }]);
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
      importFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = pruneSchema(transform.transformSchema(schema));

    expect(transformedSchema.getType('BooksApiResponse')).toBeUndefined();
    expect(
      (transformedSchema.getType('Book') as GraphQLObjectType).getFields().code,
    ).toBeUndefined();
    expect(
      (transformedSchema.getType('Book') as GraphQLObjectType)
        .getFields()
        .isAvailable.type.toString(),
    ).toBe('Boolean');
    expect(transformedSchema.getType('Author')).toBeUndefined();
    expect(
      (transformedSchema.getType('Book') as GraphQLObjectType).getFields().author.type.toString(),
    ).toBe('String!');

    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });
});
