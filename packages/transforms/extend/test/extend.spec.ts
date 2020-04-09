import extendTransform from '../src/index';
import { buildSchema, printSchema, GraphQLObjectType } from 'graphql';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { Hooks } from '@graphql-mesh/types';

describe('extend', () => {
  it('should extend schema types correctly', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        user: User!
      }

      type User {
        id: ID!
      }
    `);

    const newSchema = await extendTransform({
      schema,
      config: `extend type User { newField: String! }`,
      cache: new InMemoryLRUCache(),
      hooks: new Hooks(),
    });

    const type: GraphQLObjectType = newSchema.getType('User') as GraphQLObjectType;
    const fields = type.getFields();

    expect(Object.keys(fields).length).toBe(2);
    expect(fields.newField).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should extend root schema types correctly', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        user: User!
      }

      type User {
        id: ID!
      }
    `);

    const newSchema = await extendTransform({
      schema,
      config: `extend type Query { newField: String! }`,
      cache: new InMemoryLRUCache(),
      hooks: new Hooks(),
    });

    const type = newSchema.getQueryType()!;
    const fields = type.getFields();

    expect(Object.keys(fields).length).toBe(2);
    expect(fields.newField).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });
});
