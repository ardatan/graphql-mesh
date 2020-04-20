import { buildSchema, printSchema } from 'graphql';
import filterTransform from '../src';
import { EventEmitter } from 'events';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { Hooks } from '@graphql-mesh/types';

describe('filter', () => {
  it('should filter out fields', () => {
    const schema = buildSchema(/* GraphQL */ `
      type User {
        id: ID
        name: String
        username: String
        a: String
        b: String
        c: String
        d: String
        e: String
      }

      type Query {
        user: User
        admin: User
      }
    `);
    filterTransform({
      schema,
      config: ['User.!{a,b,c,d,e}', 'Query.!admin'],
      cache: new InMemoryLRUCache(),
      hooks: new EventEmitter() as Hooks,
    });

    expect(printSchema(schema).trim()).toBe(
      /* GraphQL */ `
type User {
  id: ID
  name: String
  username: String
}

type Query {
  user: User
}
`.trim()
    );
  });
});
