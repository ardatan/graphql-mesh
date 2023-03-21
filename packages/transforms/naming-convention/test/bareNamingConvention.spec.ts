import {
  buildSchema,
  execute,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLUnionType,
  parse,
  printSchema,
} from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { ImportFn, MeshPubSub } from '@graphql-mesh/types';
import { DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import NamingConventionTransform from '../src/index.js';

describe('namingConvention - bare', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      user: user!
      userById(userId: ID!): user!
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

  let cache: InMemoryLRUCache;
  let pubsub: MeshPubSub;
  const baseDir: string = undefined;
  const importFn: ImportFn = m => import(m);

  beforeEach(() => {
    cache = new InMemoryLRUCache();
    pubsub = new PubSub();
  });

  it('should change the name of types, abstractTypes, enums, fields and fieldArguments', () => {
    const transform = new NamingConventionTransform({
      config: {
        mode: 'bare',
        typeNames: 'pascalCase',
        enumValues: 'upperCase',
        fieldNames: 'camelCase',
        fieldArgumentNames: 'snakeCase',
      },
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
      logger: new DefaultLogger(),
    });
    const newSchema = transform.transformSchema(schema, {} as any);

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
    // expect(adminValue.value).toBe('admin');
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should execute the transformed schema properly', async () => {
    const schema = makeExecutableSchema({
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
          user: (_, args) => {
            return {
              id: args.Input.id,
              first_name: args.Input.first_name,
              last_name: args.Input.last_name,
              Type: args.Input.type,
            };
          },
          userById: (_, args) => {
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
    const transform = new NamingConventionTransform({
      config: {
        mode: 'bare',
        typeNames: 'lowerCase',
        enumValues: 'upperCase',
        fieldNames: 'camelCase',
        fieldArgumentNames: 'pascalCase',
      },
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
      logger: new DefaultLogger(),
    });
    const newSchema = transform.transformSchema(schema, {} as any);

    const result = await execute({
      schema: newSchema,
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
      schema: newSchema,
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
      schema: newSchema,
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
      schema: newSchema,
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

  it('should be skipped if result is gonna be empty string', async () => {
    const schema = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          _: String!
        }
      `,
      resolvers: {
        Query: {
          _: (root, args, context, info) => {
            return 'test';
          },
        },
      },
    });
    const transform = new NamingConventionTransform({
      config: {
        mode: 'bare',
        fieldNames: 'camelCase',
      },
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
      logger: new DefaultLogger(),
    });
    const newSchema = transform.transformSchema(schema, {} as any);

    const { data } = await execute({
      schema: newSchema,
      document: parse(/* GraphQL */ `
        {
          _
        }
      `),
    });
    expect(data?._).toEqual('test');
  });

  it('should skip fields of Federation spec', async () => {
    const typeDefs = /* GraphQL */ `
type Query {
  _service: String!
  _entities: [String!]!
}`.trim();
    const schema = buildSchema(typeDefs);
    const transform = new NamingConventionTransform({
      config: {
        mode: 'bare',
        fieldNames: 'snakeCase',
      },
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
      logger: new DefaultLogger(),
    });
    const newSchema = transform.transformSchema(schema, {} as any);

    expect(printSchema(newSchema)).toBe(typeDefs);
  });
});
