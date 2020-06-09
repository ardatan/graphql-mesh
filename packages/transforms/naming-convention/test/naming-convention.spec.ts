import NamingConventionTransform from '../src/index';
import { buildSchema, printSchema, GraphQLObjectType, GraphQLEnumType } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { Hooks } from '@graphql-mesh/types';
import { EventEmitter } from 'events';
import { wrapSchema } from '@graphql-tools/wrap';

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
  let hooks: Hooks;
  beforeEach(() => {
    cache = new InMemoryLRUCache();
    hooks = new EventEmitter() as Hooks;
  });

  it('should change the name of a type', () => {
    const newSchema = wrapSchema({
      schema,
      transforms: [
        new NamingConventionTransform({
          config: {
            typeNames: 'pascalCase',
            enumValues: 'upperCase',
            fieldNames: 'camelCase',
          },
          cache,
          hooks,
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
});
