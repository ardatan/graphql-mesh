import { buildSchema, printSchema } from 'graphql';
import { createFilterTransform, createPruneTransform } from '@graphql-mesh/fusion-composition';
import { composeAndGetPublicSchema, expectTheSchemaSDLToBe } from './utils.js';

describe('filter-schema', () => {
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
    const filterTransform = createFilterTransform({
      filters: ['!Comment', 'User.posts.{message, author}', 'Query.user.!pk'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);
    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      filters: ['!Comment', 'User.posts.{message, author}', 'Query.user.!pk'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      filters: [
        '!Comment',
        'Type.!LooseType',
        'Type.!{Notification, Mention}',
        'Query.user.!{notifications, mentions}',
        'User.posts.{message, author}',
        'Query.user.!pk',
      ],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      filters: ['Query.*.!pk'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      filters: ['Query.*.!pk', 'Query.userOne.!age'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      filters: ['User.!{a,b,c,d,e}', 'Query.!admin', 'Book.{id,name,author}'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
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

    const filterTransform = createFilterTransform({
      filters: ['Mutation.!*'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform, createPruneTransform()],
      },
    ]);
    expectTheSchemaSDLToBe(
      schema,
      /* GraphQL */ `
        type Query {
          foo: String
          bar: String
        }
      `,
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
    const filterTransform = createFilterTransform({
      filters: ['User.{id, username}', 'Query.!{admin}', 'Book.{id}'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
      /* GraphQL */ `
type Book {
  id: ID
}

type User {
  id: ID
  username: String
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
    const filterTransform = createFilterTransform({
      filters: ['!Book'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      filters: ['Type.!Comment', 'Type.!{Notification, Mention}'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      // bizarre case, but logic should still work
      filters: ['Type.{Query, User, Post, String, ID}'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      filters: ['!User'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    // TODO: temporary fix
    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      filters: ['!AuthRule'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      filters: ['Query.user.!{pk, age}', 'Query.book.title'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);

    expectTheSchemaSDLToBe(
      schema,
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
    const filterTransform = createFilterTransform({
      filters: ['ITest.{id, username}'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform],
      },
    ]);
    expectTheSchemaSDLToBe(
      schema,
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
    let schema = buildSchema(/* GraphQL */ `
      type Query {
        foo: String
      }
      type Mutation {
        bar: String
      }
    `);
    const filterTransform = createFilterTransform({
      filters: ['Mutation.!bar'],
    });
    schema = await composeAndGetPublicSchema([
      {
        name: 'TEST',
        schema,
        transforms: [filterTransform, createPruneTransform()],
      },
    ]);
    expectTheSchemaSDLToBe(
      schema,
      /* GraphQL */ `
type Query {
  foo: String
}
`.trim(),
    );
  });
});
