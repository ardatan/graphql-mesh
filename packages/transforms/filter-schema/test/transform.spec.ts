import { buildSchema, printSchema } from 'graphql';
import filterSchemaTransform from '../src';
import { EventEmitter } from 'events';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { Hooks } from '@graphql-mesh/types';

describe('filter', () => {
  const cache = new InMemoryLRUCache();
  const hooks = new EventEmitter() as Hooks;
  it('should filter out fields', () => {
    const schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID
        name: String
        username: String
        a: String
        b: String
        c: String
        d: String
        e: String
      }

      type Book {
        id: ID
        name: String
        authorId: ID
        author: User
      }

      type Query {
        user: User
        admin: User
      }
    `);
    filterSchemaTransform({
      schema,
      config: ['User.!{a,b,c,d,e}', 'Query.!admin', 'Book.{id,name,author}'],
      cache,
      hooks,
    });

    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
type User {
  id: ID
  name: String
  username: String
}

type Book {
  id: ID
  name: String
  author: User
}

type Query {
  user: User
}
`.trim()
    );
  });

  it('should throw an error if fieldMap left empty', () => {
    expect(() =>
      filterSchemaTransform({
        schema: buildSchema(/* GraphQL */ `
          type Query {
            foo: String
            bar: String
          }
        `),
        config: ['Query.baz'],
        cache,
        hooks,
      })
    ).toThrowError(/Query type is now empty! Please fix your filter definitions!/);
  });
});
