import { buildSchema, printSchema } from 'graphql';
import { pruneSchema } from '@graphql-tools/utils';
import { describeTransformerTests } from '../../../testing/describeTransformerTests.js';
import FilterSchemaTransform from '../src/index.js';

describeTransformerTests('filter-schema', ({ mode, transformSchema }) => {
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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['!Comment', 'User.posts.{message, author}', 'Query.user.!pk'],
        },
      }),
    );
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
`.trim(),
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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['!Comment', 'User.posts.{message, author}', 'Query.user.!pk'],
        },
      }),
    );

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
`.trim(),
    );
  });

  it('filters correctly', async () => {
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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: [
            '!Comment',
            'Type.!LooseType',
            'Type.!{Notification, Mention}',
            'Query.user.!{notifications, mentions}',
            'User.posts.{message, author}',
            'Query.user.!pk',
          ],
        },
      }),
    );

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
`.trim(),
    );
  });

  it('filters correctly arguments on all fields in Type', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID
        name: String
        username: String
      }

      type Query {
        userOne(pk: ID!, name: String, age: Int): User
        userTwo(pk: ID!, name: String, age: Int): User
      }
    `);
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['Query.*.!pk'],
        },
      }),
    );

    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
type User {
  id: ID
  name: String
  username: String
}

type Query {
  userOne(name: String, age: Int): User
  userTwo(name: String, age: Int): User
}
`.trim(),
    );
  });

  it('filters correctly arguments on all fields in Type, plus specific field arguments', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID
        name: String
        username: String
      }

      type Query {
        userOne(pk: ID!, name: String, age: Int): User
        userTwo(pk: ID!, name: String, age: Int): User
      }
    `);
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['Query.*.!pk', 'Query.userOne.!age'],
        },
      }),
    );

    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
type User {
  id: ID
  name: String
  username: String
}

type Query {
  userOne(name: String): User
  userTwo(name: String, age: Int): User
}
`.trim(),
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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['User.!{a,b,c,d,e}', 'Query.!admin', 'Book.{id,name,author}'],
        },
      }),
    );

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
`.trim(),
    );
  });

  it('should remove type with pruning if all fields are filtered out', async () => {
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

    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['Mutation.!*'],
        },
      }),
    );
    expect(printSchema(pruneSchema(schema)).trim()).toBe(
      /* GraphQL */ `
type Query {
  foo: String
  bar: String
}
`.trim(),
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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['User.{id, username}', 'Query.!{admin}', 'Book.{id}'],
        },
      }),
    );

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
`.trim(),
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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['!Book'],
        },
      }),
    );

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
`.trim(),
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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['Type.!Comment', 'Type.!{Notification, Mention}'],
        },
      }),
    );

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
`.trim(),
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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        // bizarre case, but logic should still work
        config: { mode, filters: ['Type.{Query, User, Post, String, ID}'] },
      }),
    );

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
`.trim(),
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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['!User'],
        },
      }),
    );

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
`.trim(),
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

      directive @auth(
        query: AuthRule
        add: AuthRule
        update: AuthRule
        delete: AuthRule
        role: String!
      ) on OBJECT

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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['!AuthRule'],
        },
      }),
    );

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
`.trim(),
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
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['Query.user.!{pk, age}', 'Query.book.title'],
        },
      }),
    );

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
`.trim(),
    );
  });

  it('should filter out fields of interfaces', async () => {
    let schema = buildSchema(/* GraphQL */ `
      interface ITest {
        id: ID
        name: String
        username: String
      }
      type Test implements ITest {
        id: ID
        name: String
        username: String
      }

      type Query {
        test: Test
      }
    `);
    schema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: { mode, filters: ['ITest.{id, username}'] },
      }),
    );
    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
interface ITest {
  id: ID
  username: String
}

type Test implements ITest {
  id: ID
  name: String
  username: String
}

type Query {
  test: Test
}
`.trim(),
    );
  });

  it("should filter Mutation type out if there are no fields left after filtering it's fields", async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String
      }
      type Mutation {
        bar: String
      }
    `);
    const filteredSchema = transformSchema(
      schema,
      new FilterSchemaTransform({
        config: {
          mode,
          filters: ['Mutation.!bar'],
        },
      }),
    );
    expect(printSchema(filteredSchema).trim()).toBe(
      /* GraphQL */ `
type Query {
  foo: String
}
`.trim(),
    );
  });
});
