import SnapshotTransform from '../src';
import { computeSnapshotFilePath } from '../src/compute-snapshot-file-path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql, GraphQLResolveInfo } from 'graphql';
import { promises as fsPromises } from 'fs';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { MeshPubSub } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';
import { join } from 'path';
import { tmpdir } from 'os';
import { wrapSchema } from '@graphql-tools/wrap';
import { pick } from 'lodash';
import graphqlFields from 'graphql-fields';
import { readJSON, mkdir } from '@graphql-mesh/utils';

const { readdir, unlink, rmdir } = fsPromises || {};

async function rmdirs(dir: string) {
  let entries = await readdir(dir, { withFileTypes: true });
  let results = await Promise.all(
    entries.map(entry => {
      let fullPath = join(dir, entry.name);
      let task = entry.isDirectory() ? rmdirs(fullPath) : unlink(fullPath);
      return task.catch(error => ({ error }));
    })
  );
  results.forEach(result => {
    // Ignore missing files/directories; bail on other errors
    if (result && result.error.code !== 'ENOENT') throw result.error;
  });
  await rmdir(dir);
}

describe('snapshot', () => {
  const baseDir: string = undefined;
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
    await rmdirs(outputDir);
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
          baseDir,
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
      info: {
        parentType: {
          name: 'Query',
        },
        fieldName: 'user',
      } as GraphQLResolveInfo,
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
          baseDir,
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
  it('should respect selection set if respectSelectionSet is true', async () => {
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
            user: (_, args, info) => {
              calledCounter++;
              // filter results by selection set to project user object
              // this mimics SQL handler behaviors
              const fieldMap: Record<string, any> = graphqlFields(info);
              const fields = Object.keys(fieldMap).filter(fieldName => Object.keys(fieldMap[fieldName]).length === 0);
              const foundUser = users.find(user => args.id === user.id);
              return foundUser ?? pick(foundUser, ...fields);
            },
          },
        },
      }),
      transforms: [
        new SnapshotTransform({
          config: {
            apply: ['Query.user'],
            outputDir,
            respectSelectionSet: true,
          },
          cache: new InMemoryLRUCache(),
          pubsub,
          baseDir,
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

    const doTheSecondRequest = () =>
      graphql({
        schema,
        source: /* GraphQL */ `
          {
            user(id: "1") {
              id
              name
            }
          }
        `,
      });
    await doTheSecondRequest();
    expect(calledCounter).toBe(2);
    await doTheSecondRequest();
    expect(calledCounter).toBe(2);
  });
});
