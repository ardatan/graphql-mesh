import { buildSchema, printSchema } from 'graphql';
import FilterSchemaTransform from '../src';
import { PubSub } from 'graphql-subscriptions';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { wrapSchema } from '@graphql-tools/wrap';

describe('filter', () => {
  const cache = new InMemoryLRUCache();
  const pubsub = new PubSub() as MeshPubSub;
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
          pubsub,
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
          pubsub,
        }),
      ],
    });
    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
type Query {
  foo: String
  bar: String
}

type Mutation`.trim()
    );
  });
  it('should filter out fields if array syntax is used only with one element', async () => {
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
          config: ['User.{id, username}', 'Query.!{admin}', 'Book.{id}'],
          cache,
          pubsub,
        }),
      ],
    });

    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
type User {
  id: ID
  username: String
}

type Book {
  id: ID
}

type Query {
  user: User
}
`.trim()
    );
  });

  it('should filter out types', async () => {
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
          config: ['Book'],
          cache,
          pubsub,
        }),
      ],
    });

    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
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

type Query {
  user: User
  admin: User
}
`.trim()
    );
  });

  it('should filter out fields of filtered types', async () => {
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
          config: ['User'],
          cache,
          pubsub,
        }),
      ],
    });

    // TODO: temporary fix
    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
type Book {
  id: ID
  name: String
  authorId: ID
}

type Query
`.trim()
    );
  });

  it('should filter out directive fields of filtered types', async () => {
    let schema = buildSchema(/* GraphQL */ `
      input AuthRule {
        and: [AuthRule]
        or: [AuthRule]
        not: AuthRule
        rule: String
      }

      directive @auth(query: AuthRule, add: AuthRule, update: AuthRule, delete: AuthRule, role: String!) on OBJECT

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
          config: ['AuthRule'],
          cache,
          pubsub,
        }),
      ],
    });

    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
directive @auth(role: String!) on OBJECT

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
`.trim()
    );
  });
});
