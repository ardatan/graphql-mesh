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

  it('should change the name of a type', () => {
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
    expect(printSchema(newSchema)).toMatchSnapshot();
  });
  it('should execute the transformed schema properly', async () => {
    let schema = buildSchema(/* GraphQL */ `
      type Query {
        user(input: UserSearchInput): User
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
});
