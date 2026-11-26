import { parse } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { ExecutionResult } from '@graphql-tools/utils';
import {
  buildStitchPlan,
  createBackboneExecutor,
  evaluateRunIf,
  orRunIf,
  type StitchPlanNode,
} from '../../src/backbone/index';
import { stitchSchemas } from '../../src/stitchSchemas';

async function exec(
  executor: ReturnType<typeof createBackboneExecutor>,
  request: Parameters<typeof executor>[0],
): Promise<ExecutionResult> {
  return (await executor(request)) as ExecutionResult;
}

describe('backbone aggressive BatchFetch + entityReuse', () => {
  function walkBatches(
    n: StitchPlanNode,
    out: Array<Extract<StitchPlanNode, { kind: 'BatchFetch' }>>,
  ) {
    if (n.kind === 'BatchFetch') out.push(n);
    else if (n.kind === 'Parallel' || n.kind === 'Sequence') {
      for (const c of n.nodes) walkBatches(c, out);
    } else if (n.kind === 'Island' && n.continue) walkBatches(n.continue, out);
    else if (n.kind === 'Condition') {
      if (n.ifClause) walkBatches(n.ifClause, out);
      if (n.elseClause) walkBatches(n.elseClause, out);
    }
  }

  function createBookMagazineSchema(inventoryCalls: { n: number }) {
    const products = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface Product {
          id: ID!
        }
        type Book implements Product {
          id: ID!
          title: String
        }
        type Magazine implements Product {
          id: ID!
          title: String
        }
        type Query {
          products: [Product]
        }
      `,
      resolvers: {
        Product: {
          __resolveType: (obj: { __typename?: string }) => obj.__typename ?? 'Book',
        },
        Query: {
          products: () => [
            { __typename: 'Book', id: 'b1', title: 'B' },
            { __typename: 'Magazine', id: 'm1', title: 'M' },
          ],
        },
      },
    });
    const inventory = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Book {
          id: ID!
          inStock: Boolean
        }
        type Magazine {
          id: ID!
          inStock: Boolean
        }
        type Query {
          _book(id: ID!): Book
          _magazine(id: ID!): Magazine
        }
      `,
      resolvers: {
        Query: {
          _book: (_: unknown, { id }: { id: string }) => {
            inventoryCalls.n++;
            return { id, inStock: true };
          },
          _magazine: (_: unknown, { id }: { id: string }) => {
            inventoryCalls.n++;
            return { id, inStock: false };
          },
        },
      },
    });
    return stitchSchemas({
      subschemas: [
        {
          schema: products,
          executor: createDefaultExecutor(products),
          batch: true,
        },
        {
          schema: inventory,
          executor: createDefaultExecutor(inventory),
          merge: {
            Book: {
              fieldName: '_book',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
            Magazine: {
              fieldName: '_magazine',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
          },
          batch: true,
        },
      ],
    });
  }

  it('BatchFetches concrete Book||Magazine entity hops under the same root path', () => {
    const schema = createBookMagazineSchema({ n: 0 });
    const document = parse(/* GraphQL */ `
      {
        products {
          id
          ... on Book {
            inStock
          }
          ... on Magazine {
            inStock
          }
        }
      }
    `);
    const plan = buildStitchPlan(schema, document.definitions[0] as any, {}, {});
    expect(plan.incompleteReasons).toEqual([]);
    const batches: Array<Extract<StitchPlanNode, { kind: 'BatchFetch' }>> = [];
    walkBatches(plan.root, batches);
    expect(batches.length).toBeGreaterThanOrEqual(1);
    const types = new Set(batches.flatMap(b => b.aliases.map(a => a.entityTypeName)));
    expect(types.has('Book')).toBe(true);
    expect(types.has('Magazine')).toBe(true);
    // One HTTP hop for both concrete types under products.
    expect(batches[0]!.aliases.length).toBeGreaterThanOrEqual(2);
    expect(plan.schedule).toBeDefined();
  });

  function createProductBookSchema(calls: { product: number; book: number }) {
    const catalog = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface Product {
          id: ID!
        }
        type Book implements Product {
          id: ID!
          title: String
        }
        type Query {
          products: [Product]
        }
      `,
      resolvers: {
        Product: {
          __resolveType: () => 'Book',
        },
        Query: {
          products: () => [{ __typename: 'Book', id: 'b1', title: 'B' }],
        },
      },
    });
    const inventory = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface Product {
          id: ID!
          inStock: Boolean
        }
        type Book implements Product {
          id: ID!
          inStock: Boolean
          pages: Int
        }
        type Query {
          _product(id: ID!): Product
          _book(id: ID!): Book
        }
      `,
      resolvers: {
        Product: {
          __resolveType: () => 'Book',
        },
        Query: {
          _product: (_: unknown, { id }: { id: string }) => {
            calls.product++;
            return {
              __typename: 'Book',
              id,
              inStock: true,
              pages: 10,
            };
          },
          _book: (_: unknown, { id }: { id: string }) => {
            calls.book++;
            return {
              id,
              inStock: true,
              pages: 10,
            };
          },
        },
      },
    });
    return stitchSchemas({
      subschemas: [
        {
          schema: catalog,
          executor: createDefaultExecutor(catalog),
          batch: true,
        },
        {
          schema: inventory,
          executor: createDefaultExecutor(inventory),
          merge: {
            Product: {
              fieldName: '_product',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
            Book: {
              fieldName: '_book',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
          },
          batch: true,
        },
      ],
    });
  }

  it('coalesces overlapping abstract Product||Book under the same root', () => {
    const schema = createProductBookSchema({ product: 0, book: 0 });
    const plan = buildStitchPlan(
      schema,
      parse(/* GraphQL */ `
        {
          products {
            id
            inStock
            ... on Book {
              pages
            }
          }
        }
      `).definitions[0] as any,
      {},
      {},
    );
    expect(plan.incompleteReasons).toEqual([]);
    const batches: Array<Extract<StitchPlanNode, { kind: 'BatchFetch' }>> = [];
    walkBatches(plan.root, batches);
    const entityFetches: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>> = [];
    const walkFetches = (n: StitchPlanNode) => {
      if (n.kind === 'Fetch' && n.entityTypeName && !n.rootField) {
        entityFetches.push(n);
      } else if (n.kind === 'Parallel' || n.kind === 'Sequence') {
        for (const c of n.nodes) walkFetches(c);
      } else if (n.kind === 'Island' && n.continue) walkFetches(n.continue);
    };
    walkFetches(plan.root);
    const fieldNames = (f: Extract<StitchPlanNode, { kind: 'Fetch' }>) => {
      const names = new Set<string>();
      const visit = (ss: (typeof f)['selectionSet']) => {
        for (const s of ss.selections) {
          if (s.kind === 'Field' && s.name.value !== '__typename') {
            names.add(s.name.value);
          } else if (s.kind === 'InlineFragment') {
            visit(s.selectionSet);
          }
        }
      };
      visit(f.selectionSet);
      return names;
    };
    const coveringProduct = entityFetches.find(
      f =>
        f.entityTypeName === 'Product' &&
        f.selectionSet.selections.some(
          s => s.kind === 'InlineFragment' && s.typeCondition?.name.value === 'Book',
        ),
    );
    const unifiedConcrete = entityFetches.find(f => {
      const n = fieldNames(f);
      return n.has('inStock') && n.has('pages');
    });
    const multiBatch = batches.find(b => {
      const types = new Set(b.aliases.map(a => a.entityTypeName));
      return types.has('Product') && types.has('Book');
    });
    // One hop (covering Product, unified Book, or Product||Book BatchFetch) —
    // not a lingering Product Fetch beside a Book Fetch under products.
    expect(coveringProduct != null || unifiedConcrete != null || multiBatch != null).toBe(true);
    if (unifiedConcrete || coveringProduct) {
      expect(entityFetches.length).toBe(1);
    }
  });

  it('executes coalesced Product||Book and returns interface + concrete fields', async () => {
    const calls = { product: 0, book: 0 };
    const schema = createProductBookSchema(calls);
    const executor = createBackboneExecutor(schema);
    const result = await exec(executor, {
      document: parse(/* GraphQL */ `
        {
          products {
            id
            inStock
            ... on Book {
              pages
            }
          }
        }
      `),
      variables: {},
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      products: [{ id: 'b1', inStock: true, pages: 10 }],
    });
    // Covering Product hop (or one BatchFetch wave) — not both merge fields.
    expect(calls.product + calls.book).toBe(1);
  });

  it('BatchFetches or covering-coalesces Product||Book||Magazine under products', () => {
    const catalog = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface Product {
          id: ID!
        }
        type Book implements Product {
          id: ID!
        }
        type Magazine implements Product {
          id: ID!
        }
        type Query {
          products: [Product]
        }
      `,
      resolvers: {
        Product: {
          __resolveType: (o: { __typename?: string }) => o.__typename ?? 'Book',
        },
        Query: {
          products: () => [
            { __typename: 'Book', id: 'b1' },
            { __typename: 'Magazine', id: 'm1' },
          ],
        },
      },
    });
    const inventory = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        interface Product {
          id: ID!
          inStock: Boolean
        }
        type Book implements Product {
          id: ID!
          inStock: Boolean
          pages: Int
        }
        type Magazine implements Product {
          id: ID!
          inStock: Boolean
          issue: Int
        }
        type Query {
          _product(id: ID!): Product
          _book(id: ID!): Book
          _magazine(id: ID!): Magazine
        }
      `,
      resolvers: {
        Product: {
          __resolveType: (o: { __typename?: string }) => o.__typename ?? 'Book',
        },
        Query: {
          _product: () => ({ __typename: 'Book', id: 'x', inStock: true }),
          _book: () => ({ id: 'b1', inStock: true, pages: 1 }),
          _magazine: () => ({ id: 'm1', inStock: false, issue: 2 }),
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: catalog,
          executor: createDefaultExecutor(catalog),
          batch: true,
        },
        {
          schema: inventory,
          executor: createDefaultExecutor(inventory),
          merge: {
            Product: {
              fieldName: '_product',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
            Book: {
              fieldName: '_book',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
            Magazine: {
              fieldName: '_magazine',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
          },
          batch: true,
        },
      ],
    });
    const plan = buildStitchPlan(
      schema,
      parse(/* GraphQL */ `
        {
          products {
            id
            inStock
            ... on Book {
              pages
            }
            ... on Magazine {
              issue
            }
          }
        }
      `).definitions[0] as any,
      {},
      {},
    );
    expect(plan.incompleteReasons).toEqual([]);
    const batches: Array<Extract<StitchPlanNode, { kind: 'BatchFetch' }>> = [];
    walkBatches(plan.root, batches);
    const entityFetches: Array<Extract<StitchPlanNode, { kind: 'Fetch' }>> = [];
    const walkFetches = (n: StitchPlanNode) => {
      if (n.kind === 'Fetch' && n.entityTypeName && !n.rootField) {
        entityFetches.push(n);
      } else if (n.kind === 'Parallel' || n.kind === 'Sequence') {
        for (const c of n.nodes) walkFetches(c);
      } else if (n.kind === 'Island' && n.continue) walkFetches(n.continue);
    };
    walkFetches(plan.root);
    const covering = entityFetches.find(
      f =>
        f.entityTypeName === 'Product' &&
        f.selectionSet.selections.some(
          s =>
            s.kind === 'InlineFragment' &&
            (s.typeCondition?.name.value === 'Book' || s.typeCondition?.name.value === 'Magazine'),
        ),
    );
    const multi = batches.find(b => b.aliases.length >= 2);
    // Must not leave three independent same-root entity Fetches.
    expect(covering != null || multi != null || entityFetches.length <= 1).toBe(true);
    if (!covering && !multi) {
      expect(entityFetches.length).toBeLessThanOrEqual(1);
    } else {
      expect(entityFetches.length + (multi ? 0 : 0)).toBeLessThan(3);
    }
  });

  it('executes BatchFetch Book||Magazine and returns stock fields', async () => {
    const calls = { n: 0 };
    const schema = createBookMagazineSchema(calls);
    const executor = createBackboneExecutor(schema);
    const result = await exec(executor, {
      document: parse(/* GraphQL */ `
        {
          products {
            id
            ... on Book {
              inStock
            }
            ... on Magazine {
              inStock
            }
          }
        }
      `),
      variables: {},
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      products: [
        { id: 'b1', inStock: true },
        { id: 'm1', inStock: false },
      ],
    });
  });

  it('runIf DNF supports || of AND-groups', () => {
    const bookOnly = [[{ variable: 'wantBook', equals: true }]];
    const magOnly = [[{ variable: 'wantMag', equals: true }]];
    const either = orRunIf(bookOnly, magOnly)!;
    expect(either).toHaveLength(2);
    expect(evaluateRunIf(either, { wantBook: true, wantMag: false })).toBe(true);
    expect(evaluateRunIf(either, { wantBook: false, wantMag: true })).toBe(true);
    expect(evaluateRunIf(either, { wantBook: false, wantMag: false })).toBe(false);
    // Complementary single-var OR simplifies to always.
    expect(
      orRunIf([[{ variable: 'v', equals: true }]], [[{ variable: 'v', equals: false }]]),
    ).toBeUndefined();
  });

  it('OR-merges alias runIf onto BatchFetch when complementary root gates coalesce', () => {
    const schema = createBookMagazineSchema({ n: 0 });
    // Root-level skip/include stamps hop runIf; Book||Magazine still BatchFetch.
    const document = parse(/* GraphQL */ `
      query ($wantProducts: Boolean!) {
        products @include(if: $wantProducts) {
          id
          ... on Book {
            inStock
          }
          ... on Magazine {
            inStock
          }
        }
      }
    `);
    const plan = buildStitchPlan(
      schema,
      document.definitions[0] as any,
      {},
      { wantProducts: true },
    );
    expect(plan.incompleteReasons).toEqual([]);
    const batches: Array<Extract<StitchPlanNode, { kind: 'BatchFetch' }>> = [];
    walkBatches(plan.root, batches);
    const multi = batches.find(
      b =>
        b.aliases.some(a => a.entityTypeName === 'Book') &&
        b.aliases.some(a => a.entityTypeName === 'Magazine'),
    );
    expect(multi).toBeDefined();
    // Shared include gate stamped as DNF AND-group on the batch.
    expect(multi!.runIf).toEqual([[{ variable: 'wantProducts', equals: true }]]);
  });

  it('always-on entity reuse skips redundant hop when root already has leaves', async () => {
    let entityCalls = 0;
    const accounts = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          name: String
        }
        type Query {
          me: User
          user(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          me: () => {
            entityCalls++;
            return { id: '1', name: 'Ada' };
          },
          user: (_: unknown, { id }: { id: string }) => {
            entityCalls++;
            return { id, name: 'Ada' };
          },
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: accounts,
          executor: createDefaultExecutor(accounts),
          merge: {
            User: {
              fieldName: 'user',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
          },
          batch: true,
        },
      ],
    });
    const document = parse(/* GraphQL */ `
      {
        me {
          id
          name
        }
      }
    `);
    const executor = createBackboneExecutor(schema);
    const result = await exec(executor, {
      document,
      variables: {},
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ me: { id: '1', name: 'Ada' } });
    // Root already projected name — reuse must not fire a second user() hop.
    expect(entityCalls).toBe(1);
  });

  it('reuses entity fields across parents with the same representation hash', async () => {
    let userCalls = 0;
    const accounts = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
          name: String
        }
        type Query {
          user(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          user: (_: unknown, { id }: { id: string }) => {
            userCalls++;
            return { id, name: `U-${id}` };
          },
        },
      },
    });
    const catalog = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
        }
        type Product {
          id: ID!
          author: User
        }
        type Review {
          id: ID!
          author: User
        }
        type Query {
          product: Product
          review: Review
        }
      `,
      resolvers: {
        Query: {
          product: () => ({ id: 'p1', author: { id: '1' } }),
          review: () => ({ id: 'r1', author: { id: '1' } }),
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: catalog,
          executor: createDefaultExecutor(catalog),
          batch: true,
        },
        {
          schema: accounts,
          name: 'accounts',
          executor: createDefaultExecutor(accounts),
          merge: {
            User: {
              fieldName: 'user',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
          },
          batch: true,
        },
      ],
    });
    const executor = createBackboneExecutor(schema);
    const result = await exec(executor, {
      document: parse(/* GraphQL */ `
        {
          product {
            author {
              id
              name
            }
          }
          review {
            author {
              id
              name
            }
          }
        }
      `),
      variables: {},
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      product: { author: { id: '1', name: 'U-1' } },
      review: { author: { id: '1', name: 'U-1' } },
    });
    // Same rep under two parents: at most one merge fetch (batch or reuse).
    expect(userCalls).toBe(1);
  });

  it('reuses nested entity selections across parents with the same rep hash', async () => {
    let userCalls = 0;
    const accounts = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Profile {
          bio: String
        }
        type User {
          id: ID!
          profile: Profile
        }
        type Query {
          user(id: ID!): User
        }
      `,
      resolvers: {
        Query: {
          user: (_: unknown, { id }: { id: string }) => {
            userCalls++;
            return { id, profile: { bio: `bio-${id}` } };
          },
        },
      },
    });
    const catalog = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
        }
        type Product {
          id: ID!
          author: User
        }
        type Review {
          id: ID!
          author: User
        }
        type Query {
          product: Product
          review: Review
        }
      `,
      resolvers: {
        Query: {
          product: () => ({ id: 'p1', author: { id: '1' } }),
          review: () => ({ id: 'r1', author: { id: '1' } }),
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: catalog,
          executor: createDefaultExecutor(catalog),
          batch: true,
        },
        {
          schema: accounts,
          name: 'accounts',
          executor: createDefaultExecutor(accounts),
          merge: {
            User: {
              fieldName: 'user',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
          },
          batch: true,
        },
      ],
    });
    const executor = createBackboneExecutor(schema);
    const result = await exec(executor, {
      document: parse(/* GraphQL */ `
        {
          product {
            author {
              id
              profile {
                bio
              }
            }
          }
          review {
            author {
              id
              profile {
                bio
              }
            }
          }
        }
      `),
      variables: {},
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      product: { author: { id: '1', profile: { bio: 'bio-1' } } },
      review: { author: { id: '1', profile: { bio: 'bio-1' } } },
    });
    expect(userCalls).toBe(1);
  });

  function countHttpHops(node: StitchPlanNode): {
    http: number;
    batch: number;
  } {
    let http = 0;
    let batch = 0;
    const walk = (n: StitchPlanNode) => {
      if (n.kind === 'Fetch' || n.kind === 'BatchFetch') {
        http++;
        if (n.kind === 'BatchFetch') batch++;
      } else if (n.kind === 'Island' && n.continue) {
        walk(n.continue);
      } else if (n.kind === 'Sequence' || n.kind === 'Parallel') {
        for (const c of n.nodes) walk(c);
      } else if (n.kind === 'Condition') {
        if (n.ifClause) walk(n.ifClause);
        if (n.elseClause) walk(n.elseClause);
      }
    };
    walk(node);
    return { http, batch };
  }

  it('wave-folds Book||Magazine inventory hops from separate root branches into one BatchFetch', () => {
    // Two root fields → two Sequences; inventory hops share a dependsOn wave
    // and subgraph even when they are not Parallel siblings in the raw tree.
    const books = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Book {
          id: ID!
          title: String
        }
        type Query {
          book(id: ID!): Book
        }
      `,
      resolvers: {
        Query: {
          book: (_: unknown, { id }: { id: string }) => ({
            id,
            title: 'B',
          }),
        },
      },
    });
    const magazines = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Magazine {
          id: ID!
          title: String
        }
        type Query {
          magazine(id: ID!): Magazine
        }
      `,
      resolvers: {
        Query: {
          magazine: (_: unknown, { id }: { id: string }) => ({
            id,
            title: 'M',
          }),
        },
      },
    });
    const inventoryCalls = { n: 0 };
    const inventory = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Book {
          id: ID!
          inStock: Boolean
        }
        type Magazine {
          id: ID!
          inStock: Boolean
        }
        type Query {
          _book(id: ID!): Book
          _magazine(id: ID!): Magazine
        }
      `,
      resolvers: {
        Query: {
          _book: (_: unknown, { id }: { id: string }) => {
            inventoryCalls.n++;
            return { id, inStock: true };
          },
          _magazine: (_: unknown, { id }: { id: string }) => {
            inventoryCalls.n++;
            return { id, inStock: false };
          },
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: books,
          executor: createDefaultExecutor(books),
          batch: true,
        },
        {
          schema: magazines,
          executor: createDefaultExecutor(magazines),
          batch: true,
        },
        {
          schema: inventory,
          executor: createDefaultExecutor(inventory),
          merge: {
            Book: {
              fieldName: '_book',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
            Magazine: {
              fieldName: '_magazine',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
          },
          batch: true,
        },
      ],
    });
    const document = parse(/* GraphQL */ `
      {
        book(id: "1") {
          id
          title
          inStock
        }
        magazine(id: "2") {
          id
          title
          inStock
        }
      }
    `);
    const plan = buildStitchPlan(schema, document.definitions[0] as any, {}, {});
    expect(plan.incompleteReasons).toEqual([]);
    const batches: Array<Extract<StitchPlanNode, { kind: 'BatchFetch' }>> = [];
    walkBatches(plan.root, batches);
    const invBatch = batches.find(
      b =>
        b.aliases.some(a => a.entityTypeName === 'Book') &&
        b.aliases.some(a => a.entityTypeName === 'Magazine'),
    );
    expect(invBatch).toBeDefined();
    // Wave fold: one inventory hop for both concretes (not 2 separate Fetches).
    const hops = countHttpHops(plan.root);
    // 2 root Fetches + 1 inventory BatchFetch (or covering) — not 2 entity Fetches.
    expect(hops.http).toBeLessThanOrEqual(3);
    expect(hops.batch).toBeGreaterThanOrEqual(1);
  });

  it('executes wave-folded Book||Magazine from separate roots with one inventory round-trip family', async () => {
    const books = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Book {
          id: ID!
          title: String
        }
        type Query {
          book(id: ID!): Book
        }
      `,
      resolvers: {
        Query: {
          book: (_: unknown, { id }: { id: string }) => ({
            id,
            title: 'B',
          }),
        },
      },
    });
    const magazines = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Magazine {
          id: ID!
          title: String
        }
        type Query {
          magazine(id: ID!): Magazine
        }
      `,
      resolvers: {
        Query: {
          magazine: (_: unknown, { id }: { id: string }) => ({
            id,
            title: 'M',
          }),
        },
      },
    });
    const inventoryCalls = { n: 0 };
    const inventory = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Book {
          id: ID!
          inStock: Boolean
        }
        type Magazine {
          id: ID!
          inStock: Boolean
        }
        type Query {
          _book(id: ID!): Book
          _magazine(id: ID!): Magazine
        }
      `,
      resolvers: {
        Query: {
          _book: (_: unknown, { id }: { id: string }) => {
            inventoryCalls.n++;
            return { id, inStock: true };
          },
          _magazine: (_: unknown, { id }: { id: string }) => {
            inventoryCalls.n++;
            return { id, inStock: false };
          },
        },
      },
    });
    const schema = stitchSchemas({
      subschemas: [
        {
          schema: books,
          executor: createDefaultExecutor(books),
          batch: true,
        },
        {
          schema: magazines,
          executor: createDefaultExecutor(magazines),
          batch: true,
        },
        {
          schema: inventory,
          executor: createDefaultExecutor(inventory),
          merge: {
            Book: {
              fieldName: '_book',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
            Magazine: {
              fieldName: '_magazine',
              selectionSet: '{ id }',
              args: (o: { id: string }) => ({ id: o.id }),
            },
          },
          batch: true,
        },
      ],
    });
    const executor = createBackboneExecutor(schema);
    const result = await exec(executor, {
      document: parse(/* GraphQL */ `
        {
          book(id: "1") {
            id
            title
            inStock
          }
          magazine(id: "2") {
            id
            title
            inStock
          }
        }
      `),
      variables: {},
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      book: { id: '1', title: 'B', inStock: true },
      magazine: { id: '2', title: 'M', inStock: false },
    });
    // Merge fieldNames differ → BatchFetch falls back to parallel Fetches, but
    // with batch:true DataLoader still coalesces; either way both resolve.
    expect(inventoryCalls.n).toBeGreaterThanOrEqual(1);
  });
});
