import NamingConventionTransform from '../src/index';
import { buildSchema, printSchema, GraphQLObjectType, GraphQLEnumType, execute, parse } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { ImportFn, MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import { addResolversToSchema } from '@graphql-tools/schema';

describe('namingConvention', () => {
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
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new NamingConventionTransform({
          apiName: '',
          importFn,
          config: {
            typeNames: 'pascalCase',
            enumValues: 'upperCase',
            fieldNames: 'camelCase',
            fieldArgumentNames: 'snakeCase',
          },
          cache,
          pubsub,
          baseDir,
        }),
      ],
    });

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
    expect(adminValue.value).toBe('admin');

    const queryRootFields = (newSchema.getType('Query') as GraphQLObjectType).getFields();
    expect(queryRootFields.userById.args[0].name).toBe('user_id');

    expect(printSchema(newSchema)).toMatchSnapshot();
  });
  it('should execute the transformed schema properly', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type Query {
        user(input: UserSearchInput): User
        userById(userId: ID!): User
      }
      type User {
        id: ID
        first_name: String
        last_name: String
      }
      input UserSearchInput {
        id: ID
        first_name: String
        last_name: String
      }
    `);
    let userInput;
    schema = addResolversToSchema({
      schema,
      resolvers: {
        Query: {
          user: (root, args, context, info) => {
            userInput = args?.input;
            return userInput;
          },
          userById: (root, args, context, info) => {
            return { id: args.userId, first_name: 'John', last_name: 'Doe' };
          },
        },
      },
    });
    schema = wrapSchema({
      schema,
      transforms: [
        new NamingConventionTransform({
          apiName: '',
          importFn,
          cache,
          pubsub,
          config: {
            fieldNames: 'camelCase',
            fieldArgumentNames: 'snakeCase',
          },
          baseDir,
        }),
      ],
    });
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          user(input: { id: "0", firstName: "John", lastName: "Doe" }) {
            id
            firstName
            lastName
          }
        }
      `),
    });
    // Pass non-transformed input to the real schema
    expect(userInput).toEqual({
      id: '0',
      first_name: 'John',
      last_name: 'Doe',
    });
    // Pass transformed output to the client
    expect(result?.data?.user).toEqual({
      id: '0',
      firstName: 'John',
      lastName: 'Doe',
    });

    const result2 = await execute({
      schema,
      document: parse(/* GraphQL */ `
        {
          userById(user_id: "1") {
            id
            firstName
            lastName
          }
        }
      `),
    });
    // Pass transformed output to the client
    expect(result2.data?.userById).toEqual({
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
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
    schema = wrapSchema({
      schema,
      transforms: [
        new NamingConventionTransform({
          apiName: '',
          importFn,
          cache,
          pubsub,
          config: {
            fieldNames: 'camelCase',
          },
          baseDir,
        }),
      ],
    });
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
  it('should skip fields of Federation spec', async () => {
    const typeDefs = /* GraphQL */ `
type Query {
  _service: String!
  _entities: [String!]!
}`.trim();
    const schema = wrapSchema({
      schema: buildSchema(typeDefs),
      transforms: [
        new NamingConventionTransform({
          apiName: '',
          importFn,
          cache,
          pubsub,
          config: {
            fieldNames: 'snakeCase',
          },
          baseDir,
        }),
      ],
    });
    expect(printSchema(schema)).toBe(typeDefs);
  });
});
