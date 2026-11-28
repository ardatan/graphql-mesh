import { parse } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { ExecutionResult, Executor } from '@graphql-tools/utils';
import { BACKBONE_EXECUTING, getBackboneExecutor } from '../../src/backbone/index';
import { stitchSchemas } from '../../src/stitchSchemas';

async function exec(
  executor: ReturnType<typeof getBackboneExecutor>,
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

    const backbone = getBackboneExecutor(schema);
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
    const remoteA = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: { hello: () => 'from-a' },
      },
    });
    const remoteB = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: { hello: () => 'from-b' },
      },
    });

    // Competing progressive-override routes (destination vs source). Controlled
    // decisions so each request's selected route is predictable.
    let useDestination = true;
    let destinationCalls = 0;
    let sourceCalls = 0;
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: remoteA,
          executor: createDefaultExecutor(remoteA),
          merge: {
            Query: {
              fields: {
                hello: {
                  override: () => {
                    destinationCalls += 1;
                    return useDestination;
                  },
                },
              },
            },
          },
        },
        {
          schema: remoteB,
          executor: createDefaultExecutor(remoteB),
          merge: {
            Query: {
              fields: {
                hello: {
                  override: () => {
                    sourceCalls += 1;
                    return !useDestination;
                  },
                },
              },
            },
          },
        },
      ],
    });

    // Count plan-cache writes by StitchPlan value shape, not key spelling.
    // Production no longer emits `::pct:` keys; a constant-key regression would
    // still write one plan entry and pass a `::pct:`-only assertion.
    let planCacheWrites = 0;
    const OriginalMap = Map;
    let active = false;
    (globalThis as any).Map = class extends OriginalMap<any, any> {
      set(key: any, value: any) {
        if (
          active &&
          value != null &&
          typeof value === 'object' &&
          'root' in value &&
          'operation' in value &&
          'fragments' in value
        ) {
          planCacheWrites += 1;
        }
        return super.set(key, value);
      }
    };

    try {
      const backbone = getBackboneExecutor(schema);
      const document = parse(`{ hello }`);
      // percent(...) in per-request active labels bypasses plan cache so
      // field override handlers re-run every request.
      const percentCtx = {
        [Symbol.for('hive.gateway.overrideLabels')]: new Set(['percent(50)']),
      };
      active = true;

      const routes: string[] = [];
      for (let i = 0; i < 10; i++) {
        useDestination = i % 2 === 0;
        const beforeDest = destinationCalls;
        const beforeSrc = sourceCalls;
        const result = await exec(backbone, { document, context: percentCtx });
        expect(result.errors).toBeUndefined();
        const hello = String((result.data as any)?.hello);
        routes.push(hello);
        expect(hello).toBe(useDestination ? 'from-a' : 'from-b');
        // Each request re-plans: both override handlers run again.
        expect(destinationCalls).toBeGreaterThan(beforeDest);
        expect(sourceCalls).toBeGreaterThan(beforeSrc);
      }
      active = false;

      expect(planCacheWrites).toBe(0);
      expect(destinationCalls).toBeGreaterThanOrEqual(10);
      expect(sourceCalls).toBeGreaterThanOrEqual(10);
      expect(routes).toEqual([
        'from-a',
        'from-b',
        'from-a',
        'from-b',
        'from-a',
        'from-b',
        'from-a',
        'from-b',
        'from-a',
        'from-b',
      ]);
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
    const backbone = getBackboneExecutor(schema);
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
    const backbone = getBackboneExecutor(schema);
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

  it('aborts later mutation roots when a non-null root completes as null without errors', async () => {
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
            return 'unused';
          },
          second: () => {
            order.push('second');
            return 'ok';
          },
        },
      },
    });
    // Downstream returns completed null with no errors (e.g. nullable subgraph
    // under a NonNull gateway field). writeRootResult must still abort.
    const mockExecutor = (async req => {
      const printed = JSON.stringify(req.document);
      if (printed.includes('first') && !printed.includes('second')) {
        order.push('first');
        return { data: { first: null } };
      }
      if (printed.includes('second')) {
        order.push('second');
        return { data: { second: 'ok' } };
      }
      return { data: null };
    }) as Executor;
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: remote,
          executor: mockExecutor,
        },
      ],
    });
    const backbone = getBackboneExecutor(schema);
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
  });

  it('continues later mutation roots when only a nullable descendant fails', async () => {
    const order: string[] = [];
    const remote = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Payload {
          optional: String
        }
        type Mutation {
          first: Payload!
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
            return { optional: null };
          },
          second: () => {
            order.push('second');
            return 'ok';
          },
        },
        Payload: {
          optional: () => {
            throw new Error('optional boom');
          },
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [{ schema: remote, executor: createDefaultExecutor(remote) }],
    });
    const backbone = getBackboneExecutor(schema);
    const result = await exec(backbone, {
      document: parse(/* GraphQL */ `
        mutation {
          first {
            optional
          }
          second
        }
      `),
    });
    // Error is confined to nullable Payload.optional; first root stays an object
    // so second must still run (do not abortRemainingHops).
    expect(order).toEqual(['first', 'second']);
    expect(result.data).toEqual({
      first: { optional: null },
      second: 'ok',
    });
    expect(result.errors?.some(e => e.message.includes('optional boom'))).toBe(true);
  });

  it('aborts later mutation roots when a non-null root Island resolves to null', async () => {
    const order: string[] = [];
    // Remote provides a Mutation type so stitchSchemas can extend it; the
    // gateway-local fields below become root Islands (not Fetch hops).
    const remote = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Mutation {
          _remote: String
        }
        type Query {
          _empty: String
        }
      `,
      resolvers: {
        Mutation: {
          _remote: () => 'remote',
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [{ schema: remote, executor: createDefaultExecutor(remote) }],
      typeDefs: /* GraphQL */ `
        extend type Mutation {
          first: String!
          second: String!
        }
      `,
      resolvers: {
        Mutation: {
          first: () => {
            order.push('first');
            return null;
          },
          second: () => {
            order.push('second');
            return 'ok';
          },
        },
      },
    });
    const stitchingInfo = schema.extensions?.['stitchingInfo'] as {
      localFields?: Map<string, Set<string>>;
    };
    expect(stitchingInfo.localFields?.get('Mutation')?.has('first')).toBe(true);
    expect(stitchingInfo.localFields?.get('Mutation')?.has('second')).toBe(true);

    const backbone = getBackboneExecutor(schema);
    const result = await exec(backbone, {
      document: parse(/* GraphQL */ `
        mutation {
          first
          second
        }
      `),
    });
    // Success-path Island null must set abortRemainingHops (Fetch parity).
    expect(order).toEqual(['first']);
    expect(result.data).toBeNull();
  });

  it('aborts later mutation roots when the executor throws on a non-null root', async () => {
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
            return 'never';
          },
          second: () => {
            order.push('second');
            return 'ok';
          },
        },
      },
    });
    const throwingExecutor: ReturnType<typeof createDefaultExecutor> = async () => {
      order.push('throw');
      throw new Error('transport down');
    };
    const schema = stitchSchemas({
      subschemas: [{ schema: remote, executor: throwingExecutor }],
    });
    const backbone = getBackboneExecutor(schema);
    const result = await exec(backbone, {
      document: parse(/* GraphQL */ `
        mutation {
          first
          second
        }
      `),
    });
    expect(order).toEqual(['throw']);
    expect(result.data).toBeNull();
    expect(result.errors?.some(e => e.message.includes('transport down'))).toBe(true);
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
    const backbone = getBackboneExecutor(schema);
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
    const backbone = getBackboneExecutor(schema);
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
    const backbone = getBackboneExecutor(schema);
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
    const backbone = getBackboneExecutor(schema);
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
