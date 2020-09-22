import { buildSchema, printSchema } from 'graphql';
import FilterSchemaTransform from '../src';
import { PubSub } from 'graphql-subscriptions';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { wrapSchema } from '@graphql-tools/wrap';

describe('filter', () => {
  const cache = new InMemoryLRUCache();
  const pubSub = new PubSub() as MeshPubSub;
  it('should filter out fields', async () => {
    let schema = buildSchema(/* GraphQL */ `
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
    schema = wrapSchema({
      schema,
      transforms: [
        new FilterSchemaTransform({
          config: ['User.!{a,b,c,d,e}', 'Query.!admin', 'Book.{id,name,author}'],
          cache,
          pubSub,
        }),
      ],
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

  it('should remove type if all fields are filtered out', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String
        bar: String
      }
      type Mutation {
        baz: String
        qux: String
      }
    `);

    schema = wrapSchema({
      schema,
      transforms: [
        new FilterSchemaTransform({
          config: ['Mutation.!*'],
          cache,
          pubSub,
        }),
      ],
    });
    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
type Query {
  foo: String
  bar: String
}`.trim()
    );
  });
});
