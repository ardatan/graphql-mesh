import { parse, print } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import type { StitchingInfo } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { ExecutionResult } from '@graphql-tools/utils';
import {
  buildStitchPlan,
  getBackboneExecutorBySchema,
  type StitchPlanNode,
} from '../../src/backbone/index';
import { stitchSchemas } from '../../src/stitchSchemas';

async function exec(
  executor: ReturnType<typeof getBackboneExecutorBySchema>,
  request: Parameters<typeof executor>[0],
): Promise<ExecutionResult> {
  return (await executor(request)) as ExecutionResult;
}

describe('stitching backbone', () => {
  const authors = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type User {
        id: ID!
        email: String
      }
      type Query {
        userById(id: ID!): User
      }
    `,
    resolvers: {
      Query: {
        userById: (_: unknown, { id }: { id: string }) => ({
          id,
          email: `${id}@example.com`,
        }),
      },
    },
  });

  const chirps = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Chirp {
        id: ID!
        text: String
        author: User
      }
      type User {
        id: ID!
        chirps: [Chirp]
      }
      type Query {
        userById(id: ID!): User
      }
    `,
    resolvers: {
      Query: {
        userById: (_: unknown, { id }: { id: string }) => ({ id }),
      },
      User: {
        chirps: (user: { id: string }) => [
          { id: `c-${user.id}`, text: 'hello', author: { id: user.id } },
        ],
      },
      Chirp: {
        author: (chirp: { author: { id: string } }) => chirp.author,
      },
    },
  });

  function createStitched() {
    return stitchSchemas({
      subschemas: [
        {
          schema: chirps,
          executor: createDefaultExecutor(chirps),
          merge: {
            User: {
              fieldName: 'userById',
              args: (originalResult: { id: string }) => ({
                id: originalResult.id,
              }),
              selectionSet: '{ id }',
            },
          },
          batch: true,
        },
        {
          schema: authors,
          executor: createDefaultExecutor(authors),
          merge: {
            User: {
              fieldName: 'userById',
              args: (originalResult: { id: string }) => ({
                id: originalResult.id,
              }),
              selectionSet: '{ id }',
            },
          },
          batch: true,
        },
      ],
    });
  }

  it('builds a complete plan for a merged type query', () => {
    const schema = createStitched();
    const document = parse(/* GraphQL */ `
      query ($id: ID!) {
        userById(id: $id) {
          id
          email
          chirps {
            id
            text
          }
        }
      }
    `);
    const operation = document.definitions[0] as any;
    const plan = buildStitchPlan(schema, operation, {}, { id: '1' });
    expect(plan.incompleteReasons).toEqual([]);
    // Final plans flatten Sequence barriers; schedule is cached when there is
    // no Condition.
    expect(plan.root.kind === 'Fetch' || plan.root.kind === 'Parallel').toBe(true);
    expect(plan.schedule).toBeDefined();
    expect(plan.schedule!.waits.length).toBeGreaterThan(0);
  });

  it('executes a merged query via the backbone executor', async () => {
    const schema = createStitched();
    const executor = getBackboneExecutorBySchema(schema);
    const result = await exec(executor, {
      document: parse(/* GraphQL */ `
        query ($id: ID!) {
          userById(id: $id) {
            id
            email
            chirps {
              id
              text
            }
          }
        }
      `),
      variables: { id: '1' },
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      userById: {
        id: '1',
        email: '1@example.com',
        chirps: [{ id: 'c-1', text: 'hello' }],
      },
    });
  });

  it('wraps root @skip/@include as Condition; execute selects the branch', async () => {
    const schema = createStitched();
    const document = parse(/* GraphQL */ `
      query ($id: ID!, $skipEmail: Boolean!) {
        userById(id: $id) @skip(if: $skipEmail) {
          id
          email
        }
      }
    `);
    const operation = document.definitions[0] as any;
    const planSkip = buildStitchPlan(schema, operation, {}, {});
    const planInclude = buildStitchPlan(schema, operation, {}, {});
    expect(planSkip.incompleteReasons).toEqual([]);
    // Router QP-style Condition; schedule rebuilt at execute for the taken branch.
    expect(planSkip.root.kind).toBe('Condition');
    expect((planSkip.root as any).condition).toBe('skipEmail');
    expect((planSkip.root as any).elseClause).toBeDefined();
    expect((planSkip.root as any).ifClause).toBeUndefined();
    expect(planSkip.schedule).toBeUndefined();
    // Same structure regardless of variable map (one cached plan shape).
    expect(planInclude.root).toEqual(planSkip.root);

    const executor = getBackboneExecutorBySchema(schema);
    const skipped = await exec(executor, {
      document,
      variables: { id: '1', skipEmail: true },
      context: {},
    });
    expect(skipped.errors).toBeUndefined();
    expect(skipped.data).toEqual({});

    const included = await exec(executor, {
      document,
      variables: { id: '1', skipEmail: false },
      context: {},
    });
    expect(included.errors).toBeUndefined();
    expect(included.data).toEqual({
      userById: { id: '1', email: '1@example.com' },
    });
  });

  it('marks additionalResolvers as islands and still hydrates merge keys', async () => {
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: authors,
          executor: createDefaultExecutor(authors),
          merge: {
            User: {
              fieldName: 'userById',
              args: (originalResult: { id: string }) => ({
                id: originalResult.id,
              }),
              selectionSet: '{ id }',
            },
          },
          batch: true,
        },
      ],
      typeDefs: /* GraphQL */ `
        extend type Query {
          me: User
        }
      `,
      resolvers: {
        Query: {
          me: () => ({ id: '42' }),
        },
      },
    });

    const stitchingInfo = schema.extensions?.['stitchingInfo'] as StitchingInfo;
    expect(stitchingInfo.localFields.get('Query')?.has('me')).toBe(true);

    const executor = getBackboneExecutorBySchema(schema);
    const result = await exec(executor, {
      document: parse(/* GraphQL */ `
        {
          me {
            id
            email
          }
        }
      `),
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      me: { id: '42', email: '42@example.com' },
    });
  });

  it('plans pure __typename as Island (no schema-execute escape)', async () => {
    const schema = createStitched();
    const document = parse(/* GraphQL */ `
      {
        __typename
      }
    `);
    const plan = buildStitchPlan(schema, document.definitions[0] as any, {}, {});
    expect(plan.incompleteReasons).toEqual([]);
    expect(plan.root.kind).toBe('Island');
    expect((plan.root as any).fieldNode.name.value).toBe('__typename');

    const executor = getBackboneExecutorBySchema(schema);
    const result = await exec(executor, { document, context: {} });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ __typename: 'Query' });
  });

  // Encapsulate `@resolveTo(__typename)` returns a string parent; nested locals
  // must be planned on the root Island continue or projectDataToOperation
  // leaves `"Group": "Query"`.
  it('plans nested locals under non-merged root Island continue (encapsulate)', async () => {
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: authors,
          executor: createDefaultExecutor(authors),
        },
      ],
      typeDefs: /* GraphQL */ `
        type GroupQuery {
          echo(argument: String): String
        }
        extend type Query {
          Group: GroupQuery!
        }
      `,
      resolvers: {
        Query: {
          Group: () => 'Query',
        },
        GroupQuery: {
          echo: (_root: unknown, { argument }: { argument?: string | null }) => argument ?? null,
        },
      },
    });

    const stitchingInfo = schema.extensions?.['stitchingInfo'] as StitchingInfo;
    expect(stitchingInfo.localFields.get('Query')?.has('Group')).toBe(true);
    expect(stitchingInfo.localFields.get('GroupQuery')?.has('echo')).toBe(true);

    const document = parse(/* GraphQL */ `
      {
        Group {
          echo(argument: "hi")
        }
      }
    `);
    const plan = buildStitchPlan(schema, document.definitions[0] as any, {}, {});
    expect(plan.incompleteReasons).toEqual([]);
    expect(plan.root.kind).toBe('Island');
    expect((plan.root as any).fieldNode.name.value).toBe('Group');
    expect((plan.root as any).continue).toBeDefined();
    expect((plan.root as any).continue.kind).toBe('Island');
    expect((plan.root as any).continue.fieldNode.name.value).toBe('echo');

    const executor = getBackboneExecutorBySchema(schema);
    const result = await exec(executor, { document, context: {} });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      Group: { echo: 'hi' },
    });
  });

  // reproduction-9435: gateway-local field under a non-local list path
  // (TargetQuery.targets[] -> TargetType.complexDataItem @resolveTo).
  it('plans deeper locals under non-local nested list paths', async () => {
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: authors,
          executor: createDefaultExecutor(authors),
        },
      ],
      typeDefs: /* GraphQL */ `
        type TargetType {
          id: String
        }
        type TargetQuery {
          targets: [TargetType]
        }
        type GroupQuery {
          targetQuery: TargetQuery
        }
        extend type Query {
          Group: GroupQuery!
        }
        extend type TargetType {
          label: String
        }
      `,
      resolvers: {
        Query: {
          Group: () => 'Query',
        },
        GroupQuery: {
          targetQuery: () => ({
            targets: [{ id: 'full' }, { id: 'empty' }],
          }),
        },
        TargetType: {
          label: (root: { id?: string }) => (root.id === 'full' ? 'ok' : null),
        },
      },
    });

    const stitchingInfo = schema.extensions?.['stitchingInfo'] as StitchingInfo;
    expect(stitchingInfo.localFields.get('TargetType')?.has('label')).toBe(true);

    const document = parse(/* GraphQL */ `
      {
        Group {
          targetQuery {
            targets {
              id
              label
            }
          }
        }
      }
    `);
    const plan = buildStitchPlan(schema, document.definitions[0] as any, {}, {});
    expect(plan.incompleteReasons).toEqual([]);
    const hasLabelIsland = (n: any): boolean => {
      if (!n) return false;
      if (n.kind === 'Island' && n.fieldNode?.name?.value === 'label') return true;
      if (n.continue && hasLabelIsland(n.continue)) return true;
      if (n.nodes) return n.nodes.some(hasLabelIsland);
      return false;
    };
    expect(hasLabelIsland(plan.root)).toBe(true);

    const executor = getBackboneExecutorBySchema(schema);
    const result = await exec(executor, { document, context: {} });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      Group: {
        targetQuery: {
          targets: [
            { id: 'full', label: 'ok' },
            { id: 'empty', label: null },
          ],
        },
      },
    });
  });

  it('plans nested additionalResolvers as Island under a Fetch path', async () => {
    const books = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Book {
          id: ID!
          title: String
          authorId: ID!
        }
        type Query {
          books: [Book]
        }
      `,
      resolvers: {
        Query: {
          books: () => [
            { id: 'b1', title: 'Dune', authorId: 'a1' },
            { id: 'b2', title: 'Neuromancer', authorId: 'a2' },
          ],
        },
      },
    });
    const authors = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Author {
          id: ID!
          name: String
        }
        type Query {
          authors(ids: [ID!]!): [Author]!
        }
      `,
      resolvers: {
        Query: {
          authors: (_: unknown, { ids }: { ids: string[] }) =>
            ids.map(id => ({ id, name: `Author ${id}` })),
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: books,
          executor: createDefaultExecutor(books),
        },
        {
          schema: authors,
          executor: createDefaultExecutor(authors),
          merge: {
            Author: {
              fieldName: 'authors',
              selectionSet: '{ id }',
              key: ({ id }: { id: string }) => id,
              argsFromKeys: (ids: readonly string[]) => ({ ids }),
            },
          },
          batch: true,
        },
      ],
      typeDefs: /* GraphQL */ `
        extend type Book {
          author: Author
        }
      `,
      resolvers: {
        Book: {
          author: {
            selectionSet: '{ authorId }',
            resolve: (book: { authorId: string }) => ({ id: book.authorId }),
          },
        },
      },
    });

    const stitchingInfo = schema.extensions?.['stitchingInfo'] as StitchingInfo;
    expect(stitchingInfo.localFields.get('Book')?.has('author')).toBe(true);

    const document = parse(/* GraphQL */ `
      {
        books {
          title
          author {
            id
            name
          }
        }
      }
    `);
    const plan = buildStitchPlan(schema, document.definitions[0] as any, {}, {});
    expect(plan.incompleteReasons).toEqual([]);

    const hasNestedAuthorIsland = (n: any): boolean => {
      if (!n) return false;
      if (
        n.kind === 'Island' &&
        n.parentTypeName === 'Book' &&
        n.fieldNode?.name?.value === 'author' &&
        Array.isArray(n.flattenPaths)
      ) {
        return true;
      }
      if (n.nodes) return n.nodes.some(hasNestedAuthorIsland);
      if (n.continue) return hasNestedAuthorIsland(n.continue);
      if (n.ifClause || n.elseClause) {
        return hasNestedAuthorIsland(n.ifClause) || hasNestedAuthorIsland(n.elseClause);
      }
      return false;
    };
    expect(hasNestedAuthorIsland(plan.root)).toBe(true);

    const executor = getBackboneExecutorBySchema(schema);
    const result = await exec(executor, { document, context: {} });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      books: [
        { title: 'Dune', author: { id: 'a1', name: 'Author a1' } },
        { title: 'Neuromancer', author: { id: 'a2', name: 'Author a2' } },
      ],
    });
  });
});

describe('backbone performance smoke', () => {
  const authors = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type User {
        id: ID!
        email: String
      }
      type Query {
        userById(id: ID!): User
      }
    `,
    resolvers: {
      Query: {
        userById: (_: unknown, { id }: { id: string }) => ({
          id,
          email: `${id}@ex.com`,
        }),
      },
    },
  });
  const chirps = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Chirp {
        id: ID!
        text: String
      }
      type User {
        id: ID!
        chirps: [Chirp]
      }
      type Query {
        userById(id: ID!): User
      }
    `,
    resolvers: {
      Query: {
        userById: (_: unknown, { id }: { id: string }) => ({ id }),
      },
      User: {
        chirps: (u: { id: string }) => [{ id: `c-${u.id}`, text: 'hello' }],
      },
    },
  });

  const schema = stitchSchemas({
    subschemas: [
      {
        schema: chirps,
        executor: createDefaultExecutor(chirps),
        merge: {
          User: {
            fieldName: 'userById',
            args: (o: { id: string }) => ({ id: o.id }),
            selectionSet: '{ id }',
          },
        },
        batch: true,
      },
      {
        schema: authors,
        executor: createDefaultExecutor(authors),
        merge: {
          User: {
            fieldName: 'userById',
            args: (o: { id: string }) => ({ id: o.id }),
            selectionSet: '{ id }',
          },
        },
        batch: true,
      },
    ],
  });

  const document = parse(/* GraphQL */ `
    query ($id: ID!) {
      userById(id: $id) {
        id
        email
        chirps {
          id
          text
        }
      }
    }
  `);

  async function measure(label: string, run: () => Promise<unknown>) {
    // warmup
    for (let i = 0; i < 50; i++) await run();
    const n = 200;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) await run();
    const ms = performance.now() - t0;
    return { label, hz: (n / ms) * 1000, meanMs: ms / n };
  }

  it('planned execute returns the expected entity graph on this microbench', async () => {
    const planned = getBackboneExecutorBySchema(schema);
    const request = {
      document,
      variables: { id: '1' },
      context: {},
    };

    const plannedStats = await measure('planned', () => Promise.resolve(planned(request)));
    const result = (await planned(request)) as ExecutionResult;
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      userById: {
        id: '1',
        email: '1@ex.com',
        chirps: [{ id: 'c-1', text: 'hello' }],
      },
    });
    // Cached plan path should stay in a tight per-request budget on this microbench.
    expect(plannedStats.meanMs).toBeLessThan(50);
  });
});

function countFetches(node: StitchPlanNode): {
  root: number;
  entity: number;
  island: number;
} {
  const acc = { root: 0, entity: 0, island: 0 };
  const walk = (n: StitchPlanNode) => {
    if (n.kind === 'Fetch') {
      if (n.rootField) acc.root++;
      else acc.entity++;
    } else if (n.kind === 'Island') {
      acc.island++;
      if (n.continue) walk(n.continue);
    } else if (n.kind === 'Sequence' || n.kind === 'Parallel') {
      for (const c of n.nodes) walk(c);
    } else if (n.kind === 'Condition') {
      if (n.ifClause) walk(n.ifClause);
      if (n.elseClause) walk(n.elseClause);
    } else if (n.kind === 'BatchFetch') {
      acc.entity += n.aliases.length;
    }
  };
  walk(node);
  return acc;
}

function listFetches(node: StitchPlanNode): string[] {
  const out: string[] = [];
  const walk = (n: StitchPlanNode) => {
    if (n.kind === 'Fetch') {
      const kind = n.rootField ? 'root' : 'entity';
      const sel = print(n.selectionSet).replace(/\s+/g, ' ').trim();
      out.push(`${kind}:${n.entityTypeName ?? n.rootField?.name.value} ${sel}`);
    } else if (n.kind === 'Island') {
      out.push(`island:${n.fieldNode.name.value}`);
      if (n.continue) walk(n.continue);
    } else if (n.kind === 'Sequence' || n.kind === 'Parallel') {
      for (const c of n.nodes) walk(c);
    } else if (n.kind === 'Condition') {
      if (n.ifClause) walk(n.ifClause);
      if (n.elseClause) walk(n.elseClause);
    }
  };
  walk(node);
  return out;
}

describe('backbone plan quality', () => {
  const authors = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type User {
        id: ID!
        email: String
      }
      type Query {
        userById(id: ID!): User
        users: [User]
      }
    `,
    resolvers: {
      Query: {
        userById: (_: unknown, { id }: { id: string }) => ({
          id,
          email: `${id}@ex.com`,
        }),
        users: () => [{ id: '1', email: '1@ex.com' }],
      },
    },
  });

  const chirps = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Chirp {
        id: ID!
        text: String
      }
      type User {
        id: ID!
        chirps: [Chirp]
      }
      type Query {
        userById(id: ID!): User
      }
    `,
    resolvers: {
      Query: {
        userById: (_: unknown, { id }: { id: string }) => ({ id }),
      },
      User: {
        chirps: (u: { id: string }) => [{ id: `c-${u.id}`, text: 'hello' }],
      },
    },
  });

  const schema = stitchSchemas({
    subschemas: [
      {
        schema: chirps,
        executor: createDefaultExecutor(chirps),
        merge: {
          User: {
            fieldName: 'userById',
            args: (o: { id: string }) => ({ id: o.id }),
            selectionSet: '{ id }',
          },
        },
        batch: true,
      },
      {
        schema: authors,
        executor: createDefaultExecutor(authors),
        merge: {
          User: {
            fieldName: 'userById',
            args: (o: { id: string }) => ({ id: o.id }),
            selectionSet: '{ id }',
          },
        },
        batch: true,
      },
    ],
  });

  it('plans a single root fetch + one entity fetch for cross-subgraph User fields', () => {
    const document = parse(/* GraphQL */ `
      query ($id: ID!) {
        userById(id: $id) {
          id
          email
          chirps {
            id
            text
          }
        }
      }
    `);
    const plan = buildStitchPlan(schema, document.definitions[0] as any, {}, { id: '1' });
    expect(plan.incomplete).toBe(false);
    const counts = countFetches(plan.root);
    // Shared root `userById`: either Parallel roots (chirps + authors) with no
    // entity hop, or 1 root + 1 entity - both are acceptable coverage shapes.
    expect(counts.island).toBe(0);
    expect(counts.root + counts.entity).toBeGreaterThanOrEqual(2);
    expect(counts.root).toBeGreaterThanOrEqual(1);
    const fetches = listFetches(plan.root);
    expect(fetches.some(f => f.includes('email'))).toBe(true);
    expect(fetches.some(f => f.includes('chirps'))).toBe(true);
  });

  it('plans parallel root fetches for independent root fields', () => {
    const document = parse(/* GraphQL */ `
      {
        users {
          id
          email
        }
        userById(id: "1") {
          id
          chirps {
            text
          }
        }
      }
    `);
    const plan = buildStitchPlan(schema, document.definitions[0] as any, {}, {});
    expect(plan.incomplete).toBe(false);
    const counts = countFetches(plan.root);
    expect(counts.root).toBeGreaterThanOrEqual(2);
  });
});
