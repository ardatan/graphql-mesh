import { buildSchema, printSchema } from 'graphql';
import FilterSchemaTransform from '../src';
import { PubSub } from 'graphql-subscriptions';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { wrapSchema } from '@graphql-tools/wrap';

describe('filter', () => {
  const cache = new InMemoryLRUCache();
  const pubsub = new PubSub() as MeshPubSub;

  it('filters correctly with array of rules', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID
        name: String
        username: String
        posts: [Post]
      }

      type Post {
        id: ID
        message: String
        author: User
        comments: [Comment]
      }

      type Comment {
        id: ID
        message: String
      }

      type Query {
        user(pk: ID!, name: String, age: Int): User
      }
    `);
    schema = wrapSchema({
      schema,
      transforms: [
        new FilterSchemaTransform({
          config: ['!Comment', 'User.posts.{message, author}', 'Query.user.!pk'],
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
  posts: [Post]
}

type Post {
  id: ID
  message: String
  author: User
}

type Query {
  user(name: String, age: Int): User
}
`.trim()
    );
  });

  it('filters correctly with declarative syntax', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID
        name: String
        username: String
        posts: [Post]
      }

      type Post {
        id: ID
        message: String
        author: User
        comments: [Comment]
      }

      type Comment {
        id: ID
        message: String
      }

      type Query {
        user(pk: ID!, name: String, age: Int): User
      }
    `);
    schema = wrapSchema({
      schema,
      transforms: [
        new FilterSchemaTransform({
          config: { filters: ['!Comment', 'User.posts.{message, author}', 'Query.user.!pk'] },
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
  posts: [Post]
}

type Post {
  id: ID
  message: String
  author: User
}

type Query {
  user(name: String, age: Int): User
}
`.trim()
    );
  });

  it('filters correctly on "bare" mode', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID
        name: String
        username: String
        posts: [Post]
        notifications: [Notification]
        mentions: [Mention]
      }

      type Post {
        id: ID
        message: String
        author: User
        comments: [Comment]
      }

      type Comment {
        id: ID
        message: String
      }

      type Notification {
        type: Int
        content: String
      }

      type Mention {
        reference: ID
        link: String
      }

      type LooseType {
        foo: String
        bar: String
      }

      type Query {
        user(pk: ID!, name: String, age: Int): User
      }
    `);
    schema = wrapSchema({
      schema,
      transforms: [
        new FilterSchemaTransform({
          config: {
            mode: 'bare',
            filters: [
              '!Comment',
              'Type.!LooseType',
              'Type.!{Notification, Mention}',
              'Query.user.!{notifications, mentions}',
              'User.posts.{message, author}',
              'Query.user.!pk',
            ],
          },
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
  posts: [Post]
}

type Post {
  id: ID
  message: String
  author: User
}

type Query {
  user(name: String, age: Int): User
}
`.trim()
    );
  });

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
`.trim()
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

  it('should filter out single type, with pending-deprecation syntax', async () => {
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
          config: ['!Book'],
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

  it('filters out single type and multiple types rules', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID
        name: String
        username: String
        posts: [Post]
      }

      type Post {
        id: ID
        message: String
        author: User
      }

      type Comment {
        id: ID
        message: String
      }

      type Notification {
        type: Int
        content: String
      }

      type Mention {
        reference: ID
        link: String
      }

      type Query {
        user(id: ID!): User
      }
    `);
    schema = wrapSchema({
      schema,
      transforms: [
        new FilterSchemaTransform({
          config: { mode: 'bare', filters: ['Type.!Comment', 'Type.!{Notification, Mention}'] },
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
  posts: [Post]
}

type Post {
  id: ID
  message: String
  author: User
}

type Query {
  user(id: ID!): User
}
`.trim()
    );
  });

  it('handles whitelist filtering for types correctly', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID
        name: String
        username: String
        posts: [Post]
      }

      type Post {
        id: ID
        message: String
        author: User
      }

      type Comment {
        id: ID
        message: String
      }

      type Notification {
        type: Int
        content: String
      }

      type Mention {
        reference: ID
        link: String
      }

      type Query {
        user(id: ID!): User
      }
    `);
    schema = wrapSchema({
      schema,
      transforms: [
        new FilterSchemaTransform({
          // bizarre case, but logic should still work
          config: { mode: 'bare', filters: ['Type.{Query, User, Post, String, ID}'] },
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
  posts: [Post]
}

type Post {
  id: ID
  message: String
  author: User
}

type Query {
  user(id: ID!): User
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
        book: Book
        user: User
        admin: User
      }
    `);
    schema = wrapSchema({
      schema,
      transforms: [
        new FilterSchemaTransform({
          config: ['!User'],
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

type Query {
  book: Book
}
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
          config: ['!AuthRule'],
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

  it('should filter out arguments of root field', async () => {
    let schema = buildSchema(/* GraphQL */ `
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
        user(pk: ID!, name: String, age: Int): User
        book(pk: ID!, title: String): Book
      }
    `);
    schema = wrapSchema({
      schema,
      transforms: [
        new FilterSchemaTransform({
          config: ['Query.user.!{pk, age}', 'Query.book.title'],
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
  user(name: String): User
  book(title: String): Book
}
`.trim()
    );
  });
});
