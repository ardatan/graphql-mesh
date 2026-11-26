import {
  buildSchema,
  execute,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLUnionType,
  parse,
} from 'graphql';
import { MemPubSub, type PubSub } from '@graphql-hive/pubsub';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import type { ImportFn } from '@graphql-mesh/types';
import { addResolversToSchema, makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { dummyLogger as log } from '../../../../testing/dummyLogger';
import { describeTransformerTests } from '../../../testing/describeTransformerTests.js';
import NamingConventionTransform from '../src/index.js';

describeTransformerTests('naming-convention', ({ mode, transformSchema }) => {
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
  using cache = new InMemoryLRUCache();
  let pubsub: PubSub;
  const baseDir: string = undefined;
  const importFn: ImportFn = m => import(m);

  beforeEach(() => {
    pubsub = new MemPubSub();
  });

  it('should change the name of a types, enums, fields and fieldArguments', () => {
    const newSchema = transformSchema(
      schema,
      new NamingConventionTransform({
        apiName: '',
        importFn,
        config: {
          mode,
          typeNames: 'pascalCase',
          enumValues: 'upperCase',
          fieldNames: 'camelCase',
          fieldArgumentNames: 'snakeCase',
        },
        cache,
        pubsub,
        baseDir,

        log,
      }),
    );

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
    const adminValue = userTypeEnumType.getValue('ADMIN');
    expect(adminValue).toBeDefined();
    expect(printSchemaWithDirectives(newSchema)).toMatchSnapshot();
  });

  it('should execute the transformed schema properly', async () => {
    let schema = buildSchema(/* GraphQL */ `
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
    `);
    schema = addResolversToSchema({
      schema,
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
    schema = transformSchema(
      schema,
      new NamingConventionTransform({
        apiName: '',
        importFn,
        cache,
        pubsub,
        config: {
          mode,
          typeNames: 'lowerCase',
          enumValues: 'upperCase',
          fieldNames: 'camelCase',
          fieldArgumentNames: 'pascalCase',
        },
        baseDir,

        log,
      }),
    );
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          user(Input: { id: "0", firstName: "John", lastName: "Doe", type: ADMIN }) {
            id
            firstName
            lastName
            type
          }
        }
      `),
    });
    // Pass transformed output to the client
    expect(result?.data?.user).toEqual({
      id: '0',
      firstName: 'John',
      lastName: 'Doe',
      type: 'ADMIN',
    });

    const result2 = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          userById(UserId: "1") {
            id
            firstName
            lastName
            type
          }
        }
      `),
    });
    // Pass transformed output to the client
    expect(result2.data?.userById).toEqual({
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      type: 'ADMIN',
    });

    const result3 = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          userByType(Type: ADMIN) {
            firstName
            lastName
            type
            interests
          }
        }
      `),
    });
    // Pass transformed output to the client
    expect(result3.data?.userByType).toEqual({
      firstName: 'John',
      lastName: 'Smith',
      type: 'ADMIN',
      interests: ['BOOKS', 'COMICS'],
    });

    const result4 = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          node(Id: "1") {
            __typename
          }
        }
      `),
    });
    // Pass transformed output to the client
    expect(result4.data?.node).toEqual({
      __typename: 'user',
    });
  });

  it('should be skipped if the result gonna be empty string', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type Query {
        _: String!
      }
    `);
    schema = addResolversToSchema({
      schema,
      resolvers: {
        Query: {
          _: (root, args, context, info) => {
            return 'test';
          },
        },
      },
    });
    schema = transformSchema(
      schema,
      new NamingConventionTransform({
        apiName: '',
        importFn,
        cache,
        pubsub,
        config: {
          mode,
          fieldNames: 'camelCase',
        },
        baseDir,

        log,
      }),
    );
    const { data } = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          _
        }
      `),
    });
    expect(data?._).toEqual('test');
  });

  it('should be applied to default values of enums for arguments', () => {
    const newSchema = transformSchema(
      schema,
      new NamingConventionTransform({
        apiName: '',
        importFn,
        config: {
          mode,
          typeNames: 'pascalCase',
          enumValues: 'upperCase',
          fieldNames: 'camelCase',
          fieldArgumentNames: 'snakeCase',
        },
        cache,
        pubsub,
        baseDir,

        log,
      }),
    );

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
    // GraphQL 16: defaultValue string; GraphQL 17: default.literal EnumValue
    const gql17Default = (
      userTypeArg as unknown as { default?: { literal?: { kind: string; value: string } } }
    ).default;
    const enumDefault =
      typeof userTypeArg.defaultValue === 'string'
        ? userTypeArg.defaultValue
        : gql17Default?.literal?.kind === 'EnumValue'
          ? gql17Default.literal.value
          : undefined;
    expect(enumDefault).toBe('NEWBIE');
  });

  it('should resolves the data of a renamed fields correctly when arguments did not changed', async () => {
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
    const newSchema = transformSchema(
      schema,
      new NamingConventionTransform({
        apiName: '',
        importFn,
        config: {
          mode,
          fieldNames: 'camelCase',
          fieldArgumentNames: 'camelCase',
        },
        cache,
        pubsub,
        baseDir,

        log,
      }),
    );
    const { data }: any = await execute({
      schema: newSchema,
      document: parse(/* GraphQL */ `
        {
          cartGetCart(cartId: "asdf") {
            id
            amount
          }
        }
      `),
    });
    expect(data.Cart_GetCart).not.toBeDefined();
    expect(data.cartGetCart).toBeDefined();
    expect(data.cartGetCart).not.toBeNull();
    expect(data.cartGetCart.id).toBe('asdf');
  });

  it('should preserve Apollo Connectors ConnectHTTP type and HTTP method fields', () => {
    const connectSchema = buildSchema(/* GraphQL */ `
      scalar JSONSelection
      scalar URLPathTemplate

      input HTTPHeaderMapping {
        name: String!
        value: String
        from: String
      }

      input ConnectHTTP {
        GET: URLPathTemplate
        POST: URLPathTemplate
        PUT: URLPathTemplate
        headers: [HTTPHeaderMapping!]
        body: JSONSelection
      }

      directive @connect(http: ConnectHTTP, selection: JSONSelection!) on FIELD_DEFINITION

      type Query {
        me: String @connect(http: { GET: "/me" }, selection: "id")
      }
    `);

    const newSchema = transformSchema(
      connectSchema,
      new NamingConventionTransform({
        apiName: '',
        importFn,
        config: {
          mode,
          typeNames: 'pascalCase',
          fieldNames: 'camelCase',
        },
        cache,
        pubsub,
        baseDir,
        log,
      }),
    );

    expect(newSchema.getType('ConnectHTTP')).toBeDefined();
    expect(newSchema.getType('ConnectHttp')).toBeUndefined();
    expect(newSchema.getType('HTTPHeaderMapping')).toBeDefined();
    expect(newSchema.getType('JSONSelection')).toBeDefined();
    expect(newSchema.getType('URLPathTemplate')).toBeDefined();

    const connectHttp = newSchema.getType(
      'ConnectHTTP',
    ) as import('graphql').GraphQLInputObjectType;
    expect(Object.keys(connectHttp.getFields())).toEqual(
      expect.arrayContaining(['GET', 'POST', 'PUT', 'headers', 'body']),
    );
    expect(connectHttp.getFields().get).toBeUndefined();
  });
});
