import { computeSnapshotFilePath, snapshotTransform } from '../src';
import { makeExecutableSchema } from 'graphql-tools';
import { graphql } from 'graphql';
import { readFileSync, existsSync } from 'fs-extra';
import { InMemoryLRUCache } from '@graphql-mesh/cache-inmemory-lru';
import { Hooks } from '@graphql-mesh/types';

jest.mock('fs-extra');

describe('snapshot', () => {
  const outputDir = '__snapshots__';
  const users = [
    {
      id: '0',
      name: 'Uri Goldshtein',
      age: 20,
      email: 'uri.goldshtein@gmail.com',
      address: 'Earth',
    },
    {
      id: '1',
      name: 'Dotan Simha',
      age: 19,
      email: 'dotansimha@gmail.com',
      address: 'Moon',
    },
  ];
  it('it writes correct output', async () => {
    const schema = await snapshotTransform({
      schema: makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            user(id: ID): User
          }
          type User {
            id: ID
            name: String
            age: Int
            email: String
            address: String
          }
        `,
        resolvers: {
          Query: {
            user: (_, args) => users.find(user => args.id === user.id),
          },
        },
      }),
      config: {
        apply: ['Query.user'],
        outputDir,
      },
      cache: new InMemoryLRUCache(),
      hooks: new Hooks(),
    });

    await graphql({
      schema,
      source: /* GraphQL */ `
        {
          user(id: "0") {
            id
            name
            age
            email
            address
          }
        }
      `,
    });

    const fileName = computeSnapshotFilePath({
      typeName: 'Query',
      fieldName: 'user',
      args: { id: '0' },
      outputDir,
    });

    expect(existsSync(fileName)).toBeTruthy();
    expect(JSON.parse(readFileSync(fileName, 'utf8'))).toMatchObject(users[0]);
  });

  it('should not call again if there is snapshot created', async () => {
    let calledCounter = 0;
    const schema = await snapshotTransform({
      schema: makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            user(id: ID): User
          }
          type User {
            id: ID
            name: String
            age: Int
            email: String
            address: String
          }
        `,
        resolvers: {
          Query: {
            user: (_, args) => {
              calledCounter++;
              return users.find(user => args.id === user.id);
            },
          },
        },
      }),
      config: {
        apply: ['Query.user'],
        outputDir: '__snapshots__',
      },
      cache: new InMemoryLRUCache(),
      hooks: new Hooks(),
    });

    const doTheRequest = () =>
      graphql({
        schema,
        source: /* GraphQL */ `
          {
            user(id: "1") {
              id
              name
              age
              email
              address
            }
          }
        `,
      });
    await doTheRequest();
    expect(calledCounter).toBe(1);
    await doTheRequest();
    expect(calledCounter).toBe(1);
  });
});
