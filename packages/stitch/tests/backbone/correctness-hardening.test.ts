import { parse } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { ExecutionResult } from '@graphql-tools/utils';
import { BACKBONE_EXECUTING, createBackboneExecutor } from '../../src/backbone/index';
import { stitchSchemas } from '../../src/stitchSchemas';

async function exec(
  executor: ReturnType<typeof createBackboneExecutor>,
  request: Parameters<typeof executor>[0],
): Promise<ExecutionResult> {
  return (await executor(request)) as ExecutionResult;
}

describe('backbone correctness: valuesFromResults', () => {
  it('applies valuesFromResults to reorder batched merge results to key order', async () => {
    const authors = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          email: String
        }
        type Query {
          usersByIds(ids: [ID!]!): [User]!
        }
      `,
      resolvers: {
        Query: {
          // Deliberately reverse order vs keys — classic valuesFromResults reorders.
          usersByIds: (_: unknown, { ids }: { ids: string[] }) =>
            [...ids].reverse().map(id => ({ id, email: `${id}@batch.com` })),
        },
      },
    });
    const posts = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
        }
        type Post {
          id: ID!
          author: User
        }
        type Query {
          posts: [Post!]!
        }
      `,
      resolvers: {
        Query: {
          posts: () => [
            { id: 'p1', author: { id: 'u1' } },
            { id: 'p2', author: { id: 'u2' } },
          ],
        },
      },
    });

    const schema = stitchSchemas({
      subschemas: [
        {
          schema: authors,
          executor: createDefaultExecutor(authors),
          merge: {
            User: {
              selectionSet: '{ id }',
              fieldName: 'usersByIds',
              key: ({ id }: { id: string }) => id,
              argsFromKeys: (ids: readonly string[]) => ({ ids }),
              // Subgraph returns reversed order; without valuesFromResults the
              // backbone would zip emails onto the wrong parents.
              valuesFromResults: (results: Array<{ email: string }>) => [...results].reverse(),
            },
          },
        },
        { schema: posts, executor: createDefaultExecutor(posts) },
      ],
    });

    const backbone = createBackboneExecutor(schema);
    const result = await exec(backbone, {
      document: parse(/* GraphQL */ `
        {
          posts {
            id
            author {
              id
              email
            }
          }
        }
      `),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      posts: [
        { id: 'p1', author: { id: 'u1', email: 'u1@batch.com' } },
        { id: 'p2', author: { id: 'u2', email: 'u2@batch.com' } },
      ],
    });
  });
});

describe('backbone correctness: percentage progressive-override cache', () => {
  it('re-evaluates percent overrides without unbounded plan-cache growth', async () => {
    const remote = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: { hello: () => 'hi' },
      },
    });
    const schema = stitchSchemas({
      subschemas: [{ schema: remote, executor: createDefaultExecutor(remote) }],
    });

    // Instrument Map.set: random percent cache keys would grow one entry per request.
    const setCounts: number[] = [];
    const OriginalMap = Map;
    let active = false;
    (globalThis as any).Map = class extends OriginalMap<any, any> {
      set(key: any, value: any) {
        if (active && typeof key === 'string' && key.includes('::pct:')) {
          setCounts.push(1);
        }
        return super.set(key, value);
      }
    };

    try {
      const backbone = createBackboneExecutor(schema, {
        overrideLabels: ['percent(50)'],
        handleProgressiveOverride: () => Math.random() < 0.5,
      });
      const document = parse(`{ hello }`);
      active = true;
      for (let i = 0; i < 40; i++) {
        await exec(backbone, { document, context: {} });
      }
      active = false;
      // Random cache keys would record ~40 ::pct: sets; skip-cache should be 0.
      expect(setCounts.length).toBe(0);
    } finally {
      (globalThis as any).Map = OriginalMap;
    }
  });
});

describe('backbone correctness: BACKBONE_EXECUTING lifecycle', () => {
  it('clears BACKBONE_EXECUTING and sets HYDRATED after success', async () => {
    const remote = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      resolvers: { Query: { hello: () => 'hi' } },
    });
    const schema = stitchSchemas({
      subschemas: [{ schema: remote, executor: createDefaultExecutor(remote) }],
    });
    const backbone = createBackboneExecutor(schema);
    const context: Record<symbol, unknown> = {};
    await exec(backbone, {
      document: parse(`{ hello }`),
      context,
    });
    expect(context[BACKBONE_EXECUTING]).toBeUndefined();
    expect(context[Symbol.for('graphql-tools.stitch.backboneHydrated')]).toBe(true);
  });
});

describe('backbone correctness: mutation serial semantics', () => {
  it('runs mutation root fields serially and skips later fields after non-null failure', async () => {
    const order: string[] = [];
    const remote = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Mutation {
          first: String!
          second: String!
        }
        type Query {
          _empty: String
        }
      `,
      resolvers: {
        Mutation: {
          first: () => {
            order.push('first');
            throw new Error('boom');
          },
          second: () => {
            order.push('second');
            return 'ok';
          },
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [{ schema: remote, executor: createDefaultExecutor(remote) }],
    });
    const backbone = createBackboneExecutor(schema);
    const result = await exec(backbone, {
      document: parse(/* GraphQL */ `
        mutation {
          first
          second
        }
      `),
    });
    expect(order).toEqual(['first']);
    expect(result.data).toBeNull();
    expect(result.errors?.some(e => e.message.includes('boom'))).toBe(true);
  });

  it('dedupes identical mutation response keys (alias collision)', async () => {
    let calls = 0;
    const remote = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Mutation {
          touch: String!
        }
        type Query {
          _empty: String
        }
      `,
      resolvers: {
        Mutation: {
          touch: () => {
            calls += 1;
            return `n${calls}`;
          },
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [{ schema: remote, executor: createDefaultExecutor(remote) }],
    });
    const backbone = createBackboneExecutor(schema);
    // Same response key via alias — GraphQL collectFields dedupes; one call.
    const result = await exec(backbone, {
      document: parse(/* GraphQL */ `
        mutation {
          a: touch
          a: touch
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect(calls).toBe(1);
    expect(result.data).toEqual({ a: 'n1' });
  });
});

describe('backbone correctness: nullable entity hop survival', () => {
  it('keeps independent root branch when a nullable entity hop fails', async () => {
    const authors = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          email: String
        }
        type Query {
          usersByIds(ids: [ID!]!): [User]!
        }
      `,
      resolvers: {
        Query: {
          usersByIds: () => {
            throw new Error('authors down');
          },
        },
      },
    });
    const posts = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
        }
        type Post {
          id: ID!
          author: User
        }
        type Query {
          post: Post
          ping: String
        }
      `,
      resolvers: {
        Query: {
          post: () => ({ id: 'p1', author: { id: 'u1' } }),
          ping: () => 'pong',
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: authors,
          executor: createDefaultExecutor(authors),
          merge: {
            User: {
              selectionSet: '{ id }',
              fieldName: 'usersByIds',
              key: ({ id }: { id: string }) => id,
              argsFromKeys: (ids: readonly string[]) => ({ ids }),
            },
          },
        },
        { schema: posts, executor: createDefaultExecutor(posts) },
      ],
    });
    const backbone = createBackboneExecutor(schema);
    const result = await exec(backbone, {
      document: parse(/* GraphQL */ `
        {
          ping
          post {
            id
            author {
              id
              email
            }
          }
        }
      `),
    });
    // Independent root `ping` must survive a failed nullable author email hop.
    expect(result.data?.ping).toBe('pong');
    expect((result.data as any)?.post?.id).toBe('p1');
    expect((result.data as any)?.post?.author?.id).toBe('u1');
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});

describe('backbone correctness: subgraph error path remapping', () => {
  it('relocates subgraph errors onto the gateway root field path', async () => {
    const remote = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          boom: String
        }
      `,
      resolvers: {
        Query: {
          boom: () => {
            throw new Error('subgraph boom');
          },
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [{ schema: remote, executor: createDefaultExecutor(remote) }],
    });
    const backbone = createBackboneExecutor(schema);
    const result = await exec(backbone, {
      document: parse(/* GraphQL */ `
        {
          renamed: boom
        }
      `),
    });
    expect(result.data).toEqual({ renamed: null });
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors![0]!.path).toEqual(['renamed']);
  });
});

describe('backbone correctness: subschema rootValue on raw fetches', () => {
  it('forwards subschema.rootValue to entity merge executor', async () => {
    const seen: unknown[] = [];
    const authors = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          email: String
        }
        type Query {
          usersByIds(ids: [ID!]!): [User]!
        }
      `,
      resolvers: {
        Query: {
          usersByIds: (root: unknown, { ids }: { ids: string[] }) => {
            seen.push(root);
            return ids.map(id => ({ id, email: `${id}@x.com` }));
          },
        },
      },
    });
    const posts = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
        }
        type Post {
          id: ID!
          author: User
        }
        type Query {
          post: Post
        }
      `,
      resolvers: {
        Query: {
          post: () => ({ id: 'p1', author: { id: 'u1' } }),
        },
      },
    });
    const rootValue = { tag: 'authors-root' };
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: authors,
          executor: createDefaultExecutor(authors),
          rootValue,
          merge: {
            User: {
              selectionSet: '{ id }',
              fieldName: 'usersByIds',
              key: ({ id }: { id: string }) => id,
              argsFromKeys: (ids: readonly string[]) => ({ ids }),
            },
          },
        },
        { schema: posts, executor: createDefaultExecutor(posts) },
      ],
    });
    const backbone = createBackboneExecutor(schema);
    const result = await exec(backbone, {
      document: parse(/* GraphQL */ `
        {
          post {
            author {
              email
            }
          }
        }
      `),
    });
    expect(result.errors).toBeUndefined();
    expect((result.data as any)?.post?.author?.email).toBe('u1@x.com');
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.some(r => r === rootValue)).toBe(true);
  });
});
