import { prefixTransform } from '../src';
import { buildSchema, printSchema, GraphQLSchema } from 'graphql';

describe('prefix', () => {
  let schema: GraphQLSchema;

  beforeEach(() => {
    schema = buildSchema(/* GraphQL */ `
      type Query {
        user: User!
      }

      type User {
        id: ID!
      }
    `);
  });

  it('should prefix all schema types when prefix is specified explicitly', async () => {
    const newSchema = await prefixTransform({
      schema,
      config: {
        type: 'prefix',
        prefix: 'T_'
      }
    });

    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('T_User')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });

  it('should not modify root types', async () => {
    const newSchema = await prefixTransform({
      schema,
      config: {
        type: 'prefix',
        prefix: 'T_'
      }
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('T_Query')).toBeUndefined();
  });

  it('should use apiName when its available', async () => {
    const newSchema = await prefixTransform({
      schema,
      apiName: 'MyApi',
      config: {
        type: 'prefix'
      }
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('MyApi_User')).toBeDefined();
  });

  it('should allow to ignore types', async () => {
    const newSchema = await prefixTransform({
      schema,
      config: {
        prefix: 'T_',
        ignore: ['User'],
        type: 'prefix'
      }
    });

    expect(newSchema.getType('Query')).toBeDefined();
    expect(newSchema.getType('User')).toBeDefined();
  });
});
