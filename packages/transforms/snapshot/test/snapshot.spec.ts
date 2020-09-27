import SnapshotTransform from '../src';
import { computeSnapshotFilePath } from '../src/compute-snapshot-file-path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql } from 'graphql';
import { readJSON, remove, mkdir } from 'fs-extra';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';
import { join } from 'path';
import { tmpdir } from 'os';
import { wrapSchema } from '@graphql-tools/wrap';

describe('snapshot', () => {
  const outputDir = join(tmpdir(), '__snapshots__');
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
  let pubsub: MeshPubSub;
  beforeEach(async () => {
    pubsub = new PubSub();
    await mkdir(outputDir);
  });
  afterEach(async () => {
    await remove(outputDir);
  });
  it('it writes correct output', async () => {
    const schema = wrapSchema({
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
      transforms: [
        new SnapshotTransform({
          config: {
            apply: ['Query.user'],
            outputDir,
          },
          cache: new InMemoryLRUCache(),
          pubsub,
        }),
      ],
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

    expect(await readJSON(fileName)).toMatchObject(users[0]);
  });

  it('should not call again if there is snapshot created', async () => {
    let calledCounter = 0;
    const schema = wrapSchema({
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
      transforms: [
        new SnapshotTransform({
          config: {
            apply: ['Query.user'],
            outputDir,
          },
          cache: new InMemoryLRUCache(),
          pubsub,
        }),
      ],
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
