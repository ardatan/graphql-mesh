import NamingConventionTransform from '../src/index';
import { buildSchema, printSchema, GraphQLObjectType, GraphQLEnumType, execute, parse } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import { ImportFn, MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('namingConvention - bare', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      user: user!
      userById(userId: ID!): user!
    }
    type user {
      Id: ID!
      Type: userType
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

  it('should change the name of a types, enums, fields and fieldArguments', () => {
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
    });
    const newSchema = transform.transformSchema(schema, {} as any);

    expect(newSchema.getType('user')).toBeUndefined();
    const userObjectType = newSchema.getType('User') as GraphQLObjectType;
    expect(userObjectType).toBeDefined();

    const userObjectTypeFields = userObjectType.getFields();
    expect(userObjectTypeFields.Id).toBeUndefined();
    expect(userObjectTypeFields.id).toBeDefined();

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
        }
        type User {
          id: ID
          first_name: String
          last_name: String
          Type: UserType!
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
            return { id: args.userId, first_name: 'John', last_name: 'Doe', Type: 'admin' };
          },
          userByType: () => {
            return { first_name: 'John', last_name: 'Smith', Type: 'admin' };
          },
        },
      },
    });
    const transform = new NamingConventionTransform({
      config: {
        mode: 'bare',
        enumValues: 'upperCase',
        fieldNames: 'camelCase',
        fieldArgumentNames: 'pascalCase',
      },
      apiName: '',
      cache,
      pubsub,
      baseDir,
      importFn,
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
          }
        }
      `),
    });
    // Pass transformed output to the client
    expect(result3.data?.userByType).toEqual({
      firstName: 'John',
      lastName: 'Smith',
      type: 'ADMIN',
    });
  });

  it('should be skipped if the result gonna be empty string', async () => {
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
    });
    const newSchema = transform.transformSchema(schema, {} as any);

    expect(printSchema(newSchema)).toBe(typeDefs);
  });
});
