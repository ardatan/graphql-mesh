import renameTransform from './../src/index';
import { buildSchema, printSchema } from 'graphql';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { Hooks } from '@graphql-mesh/types';

describe('rename', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      user: User!
    }

    type User {
      id: ID!
    }
  `);

  it('should change the name of a type', async () => {
    const newSchema = await renameTransform({
      schema,
      config: [
        {
          from: 'User',
          to: 'MyUser',
        },
      ],
      cache: new InMemoryLRUCache(),
      hooks: new Hooks(),
    });

    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('MyUser')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });
});
