/* eslint-disable import/no-extraneous-dependencies */
import { GraphQLObjectType, printSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import type { Logger, MeshPubSub } from '@graphql-mesh/types';
import { defaultImportFn, PubSub } from '@graphql-mesh/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { dummyLogger as logger } from '../../../../testing/dummyLogger';
import TransferFieldTransform from '../src/index.js';

describe('transfer-schema transform', () => {
  const schemaDefs = /* GraphQL */ `
    type Query {
      books: [Book]
      addBook(title: String, author: String): Book
    }

    type Mutation {
      ourBooks: [Book]
    }

    type Book {
      title: String!
      author: String!
    }
  `;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;
  using cache = new InMemoryLRUCache();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    pubsub = new PubSub();
  });

  it('should move and copy fields correctly', async () => {
    const transform = new TransferFieldTransform({
      config: {
        transfers: [
          {
            from: 'Mutation.ourBooks',
            to: 'Query',
          },
          {
            from: 'Query.addBook',
            to: 'Mutation',
            action: 'move',
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      importFn: defaultImportFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = transform.transformSchema(schema);

    // test copy
    expect(
      (transformedSchema.getType('Mutation') as GraphQLObjectType)
        .getFields()
        .ourBooks.type.toString(),
    ).toBe('[Book]');
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType)
        .getFields()
        .ourBooks.type.toString(),
    ).toBe('[Book]');

    // test move
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().addBook,
    ).toBeUndefined();
    expect(
      (transformedSchema.getType('Mutation') as GraphQLObjectType)
        .getFields()
        .addBook.type.toString(),
    ).toBe('Book');
    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });

  it('should move all fields when using whildcard "*"', async () => {
    const transform = new TransferFieldTransform({
      config: {
        transfers: [
          {
            from: 'Mutation.*',
            to: 'Query',
            action: 'move',
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      importFn: defaultImportFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(transformedSchema.getType('Mutation') as GraphQLObjectType).toBeUndefined();
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.type.toString(),
    ).toBe('[Book]');
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().addBook.type.toString(),
    ).toBe('Book');
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType)
        .getFields()
        .ourBooks.type.toString(),
    ).toBe('[Book]');
    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });

  it('should move selected arguments correctly', async () => {
    const transform = new TransferFieldTransform({
      config: {
        transfers: [
          {
            from: 'Query.addBook.{title, author}',
            to: 'Query.books',
            action: 'move',
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      importFn: defaultImportFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().addBook.args,
    ).toHaveLength(0);
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.args,
    ).toHaveLength(2);
    const titleArg = (transformedSchema.getType('Query') as GraphQLObjectType)
      .getFields()
      .books.args.find(({ name }) => name === 'title');
    const authorArg = (transformedSchema.getType('Query') as GraphQLObjectType)
      .getFields()
      .books.args.find(({ name }) => name === 'author');
    expect(titleArg).toBeDefined();
    expect(titleArg.type.toString()).toBe('String');
    expect(authorArg).toBeDefined();
    expect(authorArg.type.toString()).toBe('String');
    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });

  it('should copy selected arguments correctly', async () => {
    const transform = new TransferFieldTransform({
      config: {
        transfers: [
          {
            from: 'Query.addBook.{title, author}',
            to: 'Query.books',
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      importFn: defaultImportFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().addBook.args,
    ).toHaveLength(2);
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.args,
    ).toHaveLength(2);
    const titleArg = (transformedSchema.getType('Query') as GraphQLObjectType)
      .getFields()
      .books.args.find(({ name }) => name === 'title');
    const authorArg = (transformedSchema.getType('Query') as GraphQLObjectType)
      .getFields()
      .books.args.find(({ name }) => name === 'author');
    expect(titleArg).toBeDefined();
    expect(titleArg.type.toString()).toBe('String');
    expect(authorArg).toBeDefined();
    expect(authorArg.type.toString()).toBe('String');
    expect(printSchema(transformedSchema)).toMatchSnapshot();
  });

  it('should move all arguments when using wildcard "*"', async () => {
    const transform = new TransferFieldTransform({
      config: {
        transfers: [
          {
            from: 'Query.addBook.*',
            to: 'Query.books',
            action: 'move',
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      importFn: defaultImportFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().addBook.args,
    ).toHaveLength(0);
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.args,
    ).toHaveLength(2);
    const titleArg = (transformedSchema.getType('Query') as GraphQLObjectType)
      .getFields()
      .books.args.find(({ name }) => name === 'title');
    const authorArg = (transformedSchema.getType('Query') as GraphQLObjectType)
      .getFields()
      .books.args.find(({ name }) => name === 'author');
    expect(titleArg).toBeDefined();
    expect(titleArg.type.toString()).toBe('String');
    expect(authorArg).toBeDefined();
    expect(authorArg.type.toString()).toBe('String');
  });

  it('should copy all arguments when using wildcard "*"', async () => {
    const transform = new TransferFieldTransform({
      config: {
        transfers: [
          {
            from: 'Query.addBook.*',
            to: 'Query.books',
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      importFn: defaultImportFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().addBook.args,
    ).toHaveLength(2);
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.args,
    ).toHaveLength(2);
    const titleArg = (transformedSchema.getType('Query') as GraphQLObjectType)
      .getFields()
      .books.args.find(({ name }) => name === 'title');
    const authorArg = (transformedSchema.getType('Query') as GraphQLObjectType)
      .getFields()
      .books.args.find(({ name }) => name === 'author');
    expect(titleArg).toBeDefined();
    expect(titleArg.type.toString()).toBe('String');
    expect(authorArg).toBeDefined();
    expect(authorArg.type.toString()).toBe('String');
  });

  it('should copy all arguments but blacklisted ones', async () => {
    const transform = new TransferFieldTransform({
      config: {
        transfers: [
          {
            from: 'Query.addBook.!title',
            to: 'Query.books',
          },
        ],
      },
      cache,
      pubsub,
      baseDir,
      apiName: '',
      importFn: defaultImportFn,

      logger,
    });
    const schema = makeExecutableSchema({
      typeDefs: schemaDefs,
    });
    const transformedSchema = transform.transformSchema(schema);

    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().addBook.args,
    ).toHaveLength(2);
    expect(
      (transformedSchema.getType('Query') as GraphQLObjectType).getFields().books.args,
    ).toHaveLength(1);
    const titleArg = (transformedSchema.getType('Query') as GraphQLObjectType)
      .getFields()
      .books.args.find(({ name }) => name === 'title');
    const authorArg = (transformedSchema.getType('Query') as GraphQLObjectType)
      .getFields()
      .books.args.find(({ name }) => name === 'author');
    expect(titleArg).toBeUndefined();
    expect(authorArg).toBeDefined();
    expect(authorArg.type.toString()).toBe('String');
  });
});
