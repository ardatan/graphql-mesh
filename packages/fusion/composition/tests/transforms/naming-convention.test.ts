import { buildSchema, GraphQLEnumType, GraphQLObjectType, GraphQLUnionType } from 'graphql';
import { createNamingConventionTransform } from '@graphql-mesh/fusion-composition';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { composeAndGetExecutor, composeAndGetPublicSchema, expectTheSchemaSDLToBe } from './utils';

describe('Naming Convention', () => {
  it('changes the name of a types, enums, fields and fieldArguments', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        user: user!
        userById(userId: ID!): user!
        usersByType(type: userType! = newbie): [user!]!
        node(id: ID!): node
      }

      union node = user | Post

      type user {
        Id: ID!
        Type: userType
      }
      type Post {
        id: ID!
      }
      enum userType {
        admin
        moderator
        newbie
      }
    `);
    const transform = createNamingConventionTransform({
      typeNames: 'pascalCase',
      enumValues: 'upperCase',
      fieldNames: 'camelCase',
      fieldArgumentNames: 'snakeCase',
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'SUBGRAPH1',
        schema,
        transforms: [transform],
      },
    ]);

    expect(newSchema.getType('user')).toBeUndefined();
    const userObjectType = newSchema.getType('User') as GraphQLObjectType;
    expect(userObjectType).toBeDefined();

    expect(newSchema.getType('node')).toBeUndefined();
    const nodeUnionType = newSchema.getType('Node') as GraphQLUnionType;
    expect(nodeUnionType).toBeDefined();

    const userObjectTypeFields = userObjectType.getFields();
    expect(userObjectTypeFields.Id).toBeUndefined();
    expect(userObjectTypeFields.id).toBeDefined();

    const nodeUnionTypeTypes = nodeUnionType.getTypes();
    expect(nodeUnionTypeTypes).toHaveLength(2);
    expect(nodeUnionTypeTypes[0].name).toBe('User');
    expect(nodeUnionTypeTypes[1].name).toBe('Post');

    expect(newSchema.getType('userType')).toBeUndefined();
    const userTypeEnumType = newSchema.getType('UserType') as GraphQLEnumType;
    expect(userTypeEnumType).toBeDefined();
    expect(userTypeEnumType.getValue('Admin')).toBeUndefined();
    expectTheSchemaSDLToBe(
      newSchema,
      /* GraphQL */ `
        type Query {
          user: User!
          userById(user_id: ID!): User!
          usersByType(type: UserType! = NEWBIE): [User!]!
          node(id: ID!): Node
        }

        union Node = User | Post

        type User {
          id: ID!
          type: UserType
        }

        type Post {
          id: ID!
        }

        enum UserType {
          ADMIN
          MODERATOR
          NEWBIE
        }
      `,
    );
  });

  it('executes the transformed schema properly', async () => {
    const subgraphSchema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user(Input: UserSearchInput): User
          userById(userId: ID!): User
          userByType(type: UserType!): User
          node(id: ID!): Node
        }
        union Node = User | Post
        type User {
          id: ID
          first_name: String
          last_name: String
          Type: UserType!
          interests: [UserInterests!]!
        }
        type Post {
          id: ID!
        }
        input UserSearchInput {
          id: ID
          first_name: String
          last_name: String
          type: UserType
        }
        enum UserType {
          admin
          moderator
          newbie
        }
        enum UserInterests {
          books
          comics
          news
        }
      `,
      resolvers: {
        Query: {
          user: (root, args) => {
            return {
              id: args.Input.id,
              first_name: args.Input.first_name,
              last_name: args.Input.last_name,
              Type: args.Input.type,
            };
          },
          userById: (root, args) => {
            return {
              id: args.userId,
              first_name: 'John',
              last_name: 'Doe',
              Type: 'admin',
            };
          },
          userByType: () => {
            return {
              first_name: 'John',
              last_name: 'Smith',
              Type: 'admin',
              interests: ['books', 'comics'],
            };
          },
          node: (_, { id }) => {
            return {
              id,
            };
          },
        },
        Node: {
          __resolveType(obj: any) {
            if (obj.title) {
              return 'Post';
            }
            return 'User';
          },
        },
      },
    });
    const transform = createNamingConventionTransform({
      typeNames: 'lowerCase',
      enumValues: 'upperCase',
      fieldNames: 'camelCase',
      fieldArgumentNames: 'pascalCase',
    });
    const executor = composeAndGetExecutor([
      {
        name: 'SUBGRAPH1',
        schema: subgraphSchema,
        transforms: [transform],
      },
    ]);
    const result = await executor({
      query: /* GraphQL */ `
        {
          user(Input: { id: "0", firstName: "John", lastName: "Doe", type: ADMIN }) {
            id
            firstName
            lastName
            type
          }
        }
      `,
    });
    // Pass transformed output to the client
    expect(result?.user).toEqual({
      id: '0',
      firstName: 'John',
      lastName: 'Doe',
      type: 'ADMIN',
    });

    const result2 = await executor({
      query: /* GraphQL */ `
        {
          userById(UserId: "1") {
            id
            firstName
            lastName
            type
          }
        }
      `,
    });
    // Pass transformed output to the client
    expect(result2.userById).toEqual({
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      type: 'ADMIN',
    });

    const result3 = await executor({
      query: /* GraphQL */ `
        {
          userByType(Type: ADMIN) {
            firstName
            lastName
            type
            interests
          }
        }
      `,
    });
    // Pass transformed output to the client
    expect(result3.userByType).toEqual({
      firstName: 'John',
      lastName: 'Smith',
      type: 'ADMIN',
      interests: ['BOOKS', 'COMICS'],
    });

    const result4 = await executor({
      query: /* GraphQL */ `
        {
          node(Id: "1") {
            __typename
          }
        }
      `,
    });
    // Pass transformed output to the client
    expect(result4.node).toEqual({
      __typename: 'user',
    });
  });

  it('skips if the result is empty string', async () => {
    const subgraph = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          _: String!
        }
      `,
      resolvers: {
        Query: {
          _: () => 'test',
        },
      },
    });
    const transform = createNamingConventionTransform({
      fieldNames: 'camelCase',
    });
    const executor = composeAndGetExecutor([
      {
        name: 'SUBGRAPH1',
        schema: subgraph,
        transforms: [transform],
      },
    ]);
    const result = await executor({
      query: /* GraphQL */ `
        {
          _
        }
      `,
    });
    expect(result._).toBe('test');
  });

  it('applies to default values of enums for arguments', async () => {
    const subgraph = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          user: user!
          userById(userId: ID!): user!
          usersByType(type: userType! = newbie): [user!]!
          node(id: ID!): node
        }

        union node = user | Post

        type user {
          Id: ID!
          Type: userType
        }
        type Post {
          id: ID!
        }
        enum userType {
          admin
          moderator
          newbie
        }
      `,
    });
    const transform = createNamingConventionTransform({
      typeNames: 'pascalCase',
      enumValues: 'upperCase',
      fieldNames: 'camelCase',
      fieldArgumentNames: 'snakeCase',
    });
    const newSchema = await composeAndGetPublicSchema([
      {
        name: 'SUBGRAPH1',
        schema: subgraph,
        transforms: [transform],
      },
    ]);
    const userTypeEnum = newSchema.getType('UserType') as GraphQLEnumType;
    expect(userTypeEnum).toBeDefined();
    const enumTypeValues = userTypeEnum.getValues().map(x => x.name);
    expect(enumTypeValues).toContain('ADMIN');
    expect(enumTypeValues).toContain('MODERATOR');
    expect(enumTypeValues).toContain('NEWBIE');

    const query = newSchema.getType('Query') as GraphQLObjectType;
    const fields = query.getFields();
    const fieldUsersByType = fields.usersByType;
    expect(fieldUsersByType).toBeDefined();
    expect(fieldUsersByType.args).toBeDefined();
    const userTypeArg = fieldUsersByType.args[0];
    expect(userTypeArg).toBeDefined();
    expect(userTypeArg.defaultValue).toBeDefined();
    expect(userTypeArg.defaultValue).not.toBeNull();
    expect(userTypeArg.defaultValue).toBe('NEWBIE');
  });

  it('resolves the data of renamed fields correctly when arguments are not changed', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          Cart_GetCart(cartId: String!, expand: [String]): Cart
        }

        type Cart {
          Id: String!
          Amount: Int!
        }
      `,
      resolvers: {
        Query: {
          Cart_GetCart: (_, args) => {
            return {
              Id: args.cartId,
              Amount: 1234,
            };
          },
        },
        Cart: {
          Id: root => root.Id,
          Amount: root => root.Amount,
        },
      },
    });
    const transform = createNamingConventionTransform({
      fieldNames: 'camelCase',
      fieldArgumentNames: 'camelCase',
    });
    const executor = composeAndGetExecutor([
      {
        name: 'SUBGRAPH1',
        schema,
        transforms: [transform],
      },
    ]);
    const data = await executor({
      query: /* GraphQL */ `
        {
          cartGetCart(cartId: "asdf") {
            id
            amount
          }
        }
      `,
    });
    expect(data.Cart_GetCart).not.toBeDefined();
    expect(data.cartGetCart).toBeDefined();
    expect(data.cartGetCart).not.toBeNull();
    expect(data.cartGetCart.id).toBe('asdf');
  });
});
