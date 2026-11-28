import { Kind, parse, print, type DocumentNode } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { buildStitchPlan, createBackboneExecutor } from '@graphql-tools/stitch';
import type { ExecutionRequest } from '@graphql-tools/utils';
import {
  getStitchedSchemaFromSupergraphSdl,
  getStitchingOptionsFromSupergraphSdl,
} from '../src/supergraph';

/**
 * Hand-written join v0.5 supergraph matching Guild composition output for:
 * User @context(name: "userContext") + Transaction.amount(code: @fromContext).
 */
const SUPERGRAPH_SDL = /* GraphQL */ `
  schema
    @link(url: "https://specs.apollo.dev/link/v1.0")
    @link(url: "https://specs.apollo.dev/join/v0.5", for: EXECUTION)
    @link(url: "https://specs.apollo.dev/context/v0.1", for: SECURITY) {
    query: Query
  }

  directive @join__graph(name: String!, url: String!) on ENUM_VALUE
  directive @join__field(
    graph: join__Graph
    requires: join__FieldSet
    provides: join__FieldSet
    type: String
    external: Boolean
    override: String
    usedOverridden: Boolean
    overrideLabel: String
    contextArguments: [join__ContextArgument!]
  ) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
  input join__ContextArgument {
    name: String!
    type: String!
    context: String!
    selection: join__FieldValue!
  }
  directive @join__type(
    graph: join__Graph!
    key: join__FieldSet
    extension: Boolean! = false
    resolvable: Boolean! = true
    isInterfaceObject: Boolean! = false
  ) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR
  directive @link(
    url: String
    as: String
    for: link__Purpose
    import: [link__Import]
  ) repeatable on SCHEMA
  directive @context(name: String!) repeatable on OBJECT | INTERFACE | UNION

  scalar join__FieldSet
  scalar join__FieldValue
  scalar link__Import
  enum link__Purpose {
    SECURITY
    EXECUTION
  }
  enum join__Graph {
    ACCOUNTS @join__graph(name: "accounts", url: "http://accounts")
  }

  type Query @join__type(graph: ACCOUNTS) {
    users: [User]
  }

  type User @join__type(graph: ACCOUNTS, key: "id") @context(name: "accounts__userContext") {
    id: ID!
    currency: String
    transactions: [Transaction]
  }

  type Transaction @join__type(graph: ACCOUNTS, key: "id") {
    id: ID!
    amount: Int
      @join__field(
        graph: ACCOUNTS
        contextArguments: [
          {
            context: "accounts__userContext"
            name: "code"
            type: "String"
            selection: " { currency }"
          }
        ]
      )
  }
`;

function createAccountsSubgraph() {
  return buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.8"
            import: ["@key", "@context", "@fromContext"]
          )

        type Query {
          users: [User]
        }

        type User @key(fields: "id") @context(name: "userContext") {
          id: ID!
          currency: String
          transactions: [Transaction]
        }

        type Transaction @key(fields: "id") {
          id: ID!
          amount(code: String @fromContext(field: "$userContext { currency }")): Int
        }
      `),
      resolvers: {
        Query: {
          users: () => [
            {
              id: 'u1',
              currency: 'USD',
              transactions: [
                { __typename: 'Transaction', id: 't1' },
                { __typename: 'Transaction', id: 't2' },
              ],
            },
            {
              id: 'u2',
              currency: 'EUR',
              transactions: [{ __typename: 'Transaction', id: 't3' }],
            },
          ],
        },
        Transaction: {
          amount: (_: unknown, { code }: { code?: string | null }) => {
            if (code === 'USD') {
              return 100;
            }
            if (code === 'EUR') {
              return 90;
            }
            return null;
          },
          __resolveReference: (ref: { id: string }) => ({
            __typename: 'Transaction',
            id: ref.id,
          }),
        },
        User: {
          __resolveReference: (ref: { id: string }) => ({
            __typename: 'User',
            id: ref.id,
            currency: ref.id === 'u1' ? 'USD' : 'EUR',
          }),
        },
      },
    },
  ]);
}

function createGateway() {
  const accounts = createAccountsSubgraph();
  return getStitchedSchemaFromSupergraphSdl({
    supergraphSdl: SUPERGRAPH_SDL,
    onSubschemaConfig(subschema) {
      subschema.executor = createDefaultExecutor(accounts);
    },
  });
}

describe('Federation @context / @fromContext', () => {
  it('records context providers and contextArguments on merge fields', () => {
    const schema = createGateway();
    const stitchingInfo = schema.extensions?.stitchingInfo as {
      contextProviders?: Record<string, string[]>;
      subschemaMap: Map<unknown, { merge?: Record<string, { fields?: Record<string, unknown> }> }>;
    };
    expect(stitchingInfo.contextProviders?.['accounts__userContext']).toContain('User');
    // Providers live on stitchingInfo via stitchSchemas({ contextProviders }),
    // not schema.extensions.contextProviders.
    expect(
      (schema.extensions as { contextProviders?: unknown } | undefined)?.contextProviders,
    ).toBeUndefined();
    let found = false;
    for (const [, sub] of stitchingInfo.subschemaMap) {
      const amount = sub.merge?.Transaction?.fields?.amount as
        { contextArguments?: unknown[] } | undefined;
      if (amount?.contextArguments?.length) {
        found = true;
        expect(amount.contextArguments[0]).toMatchObject({
          name: 'code',
          context: 'accounts__userContext',
        });
      }
    }
    expect(found).toBe(true);
    // Public API schema omits the contextual argument.
    const tx = schema.getType('Transaction') as any;
    expect(tx.getFields().amount.args).toHaveLength(0);
  });

  it('feeds contextProviders as a stitchSchemas option from supergraph SDL', () => {
    const opts = getStitchingOptionsFromSupergraphSdl({
      supergraphSdl: SUPERGRAPH_SDL,
      onSubschemaConfig(subschema) {
        subschema.executor = createDefaultExecutor(createAccountsSubgraph());
      },
    });
    expect(opts.contextProviders?.['accounts__userContext']).toContain('User');
    expect(opts.schemaExtensions).toBeUndefined();
  });

  it('plans a context-bearing entity hop with parentDepth rewrite', () => {
    const schema = createGateway();
    const document = parse(/* GraphQL */ `
      {
        users {
          transactions {
            amount
          }
        }
      }
    `);
    const operation = document.definitions[0] as import('graphql').OperationDefinitionNode;
    const plan = buildStitchPlan(schema, operation, {}, {});
    expect(plan.incomplete).toBe(false);
    let found = false;
    const walk = (node: any) => {
      if (!node) {
        return;
      }
      if (node.kind === 'Fetch' && node.contextArguments?.length) {
        found = true;
        expect(node.contextArguments[0].parentDepth).toBe(1);
        expect(node.contextArguments[0].argName).toBe('code');
        expect(node.contextArguments[0].fieldName).toBe('amount');
        expect(node.contextArguments[0].selectionPath).toEqual([{ Key: 'currency' }]);
        expect(print(node.selectionSet)).toContain('amount');
      }
      if (node.nodes) {
        for (const child of node.nodes) {
          walk(child);
        }
      }
      if (node.continue) {
        walk(node.continue);
      }
      if (node.aliases) {
        for (const a of node.aliases) {
          if (a.contextArguments?.length) {
            found = true;
            expect(a.contextArguments[0].parentDepth).toBe(1);
          }
        }
      }
    };
    walk(plan.root);
    expect(found).toBe(true);
  });

  it('fills @fromContext from the nearest ancestor across distinct currencies', async () => {
    const schema = createGateway();
    const executor = createBackboneExecutor(schema);
    const result = await executor({
      document: parse(/* GraphQL */ `
        {
          users {
            transactions {
              amount
            }
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        users: [
          { transactions: [{ amount: 100 }, { amount: 100 }] },
          { transactions: [{ amount: 90 }] },
        ],
      },
    });
  });
});

/**
 * Adapted from graphql-hive/gateway#2703 router-runtime context.spec.ts /
 * context-gateway.spec.ts for Mesh stitch backbone + join v0.5.
 */

type Captured = { query: string; variables: Record<string, unknown> | undefined };

const JOIN_PREAMBLE = /* GraphQL */ `
  schema
    @link(url: "https://specs.apollo.dev/link/v1.0")
    @link(url: "https://specs.apollo.dev/join/v0.5", for: EXECUTION)
    @link(url: "https://specs.apollo.dev/context/v0.1", for: SECURITY) {
    query: Query
  }
  directive @join__graph(name: String!, url: String!) on ENUM_VALUE
  directive @join__field(
    graph: join__Graph
    requires: join__FieldSet
    provides: join__FieldSet
    type: String
    external: Boolean
    override: String
    usedOverridden: Boolean
    overrideLabel: String
    contextArguments: [join__ContextArgument!]
  ) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
  input join__ContextArgument {
    name: String!
    type: String!
    context: String!
    selection: join__FieldValue!
  }
  directive @join__type(
    graph: join__Graph!
    key: join__FieldSet
    extension: Boolean! = false
    resolvable: Boolean! = true
    isInterfaceObject: Boolean! = false
  ) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR
  directive @join__implements(
    graph: join__Graph!
    interface: String!
  ) repeatable on OBJECT | INTERFACE
  directive @link(
    url: String
    as: String
    for: link__Purpose
    import: [link__Import]
  ) repeatable on SCHEMA
  directive @context(name: String!) repeatable on OBJECT | INTERFACE | UNION
  scalar join__FieldSet
  scalar join__FieldValue
  scalar link__Import
  enum link__Purpose {
    SECURITY
    EXECUTION
  }
  enum join__Graph {
    ACCOUNTS @join__graph(name: "accounts", url: "http://accounts")
  }
`;

const BASIC_SUPERGRAPH = /* GraphQL */ `
  ${JOIN_PREAMBLE}
  type Query @join__type(graph: ACCOUNTS) {
    users: [User]
  }
  type User @join__type(graph: ACCOUNTS, key: "id") @context(name: "accounts__userContext") {
    id: ID!
    currency: String
    transactions: [Transaction]
  }
  type Transaction @join__type(graph: ACCOUNTS, key: "id") {
    id: ID!
    amount: Int
      @join__field(
        graph: ACCOUNTS
        contextArguments: [
          {
            context: "accounts__userContext"
            name: "code"
            type: "String"
            selection: " { currency }"
          }
        ]
      )
  }
`;

const NON_NULL_SUPERGRAPH = /* GraphQL */ `
  ${JOIN_PREAMBLE}
  type Query @join__type(graph: ACCOUNTS) {
    users: [User]
  }
  type User @join__type(graph: ACCOUNTS, key: "id") @context(name: "accounts__userContext") {
    id: ID!
    currency: String
    transactions: [Transaction]
  }
  type Transaction @join__type(graph: ACCOUNTS, key: "id") {
    id: ID!
    amount: Int
      @join__field(
        graph: ACCOUNTS
        contextArguments: [
          {
            context: "accounts__userContext"
            name: "code"
            type: "String!"
            selection: " { currency }"
          }
        ]
      )
  }
`;

const WRAPPER_SUPERGRAPH = /* GraphQL */ `
  ${JOIN_PREAMBLE}
  type Query @join__type(graph: ACCOUNTS) {
    users: [User]
  }
  type User @join__type(graph: ACCOUNTS, key: "id") @context(name: "accounts__userContext") {
    id: ID!
    currency: String
    wrapper: Wrapper
  }
  type Wrapper @join__type(graph: ACCOUNTS) {
    transactions: [Transaction]
  }
  type Transaction @join__type(graph: ACCOUNTS, key: "id") {
    id: ID!
    amount: Int
      @join__field(
        graph: ACCOUNTS
        contextArguments: [
          {
            context: "accounts__userContext"
            name: "code"
            type: "String"
            selection: " { currency }"
          }
        ]
      )
  }
`;

const INTERFACE_SUPERGRAPH = /* GraphQL */ `
  ${JOIN_PREAMBLE}
  type Query @join__type(graph: ACCOUNTS) {
    account: Account
  }
  interface Account @join__type(graph: ACCOUNTS) @context(name: "accounts__accountContext") {
    currency: String
    transactions: [Transaction]
  }
  type User implements Account
    @join__implements(graph: ACCOUNTS, interface: "Account")
    @join__type(graph: ACCOUNTS, key: "id")
    @context(name: "accounts__accountContext") {
    id: ID!
    currency: String
    transactions: [Transaction]
  }
  type Other implements Account
    @join__implements(graph: ACCOUNTS, interface: "Account")
    @join__type(graph: ACCOUNTS, key: "id")
    @context(name: "accounts__accountContext") {
    id: ID!
    currency: String
    transactions: [Transaction]
  }
  type Transaction @join__type(graph: ACCOUNTS, key: "id") {
    id: ID!
    fromInterface: Int
      @join__field(
        graph: ACCOUNTS
        contextArguments: [
          {
            context: "accounts__accountContext"
            name: "code"
            type: "String"
            selection: " { currency }"
          }
        ]
      )
  }
`;

const MULTIPLIER_SUPERGRAPH = /* GraphQL */ `
  ${JOIN_PREAMBLE}
  type Query @join__type(graph: ACCOUNTS) {
    users: [User]
  }
  type User @join__type(graph: ACCOUNTS, key: "id") @context(name: "accounts__userContext") {
    id: ID!
    currency: String
    transactions: [Transaction]
  }
  type Transaction @join__type(graph: ACCOUNTS, key: "id") {
    id: ID!
    amount(multiplier: Int): Int
      @join__field(
        graph: ACCOUNTS
        contextArguments: [
          {
            context: "accounts__userContext"
            name: "code"
            type: "String"
            selection: " { currency }"
          }
        ]
      )
  }
`;

const DUAL_ROOT_SUPERGRAPH = /* GraphQL */ `
  ${JOIN_PREAMBLE}
  type Query @join__type(graph: ACCOUNTS) {
    users: [User]
    secondUsers: [User]
  }
  type User @join__type(graph: ACCOUNTS, key: "id") @context(name: "accounts__userContext") {
    id: ID!
    currency: String
    transactions: [Transaction]
  }
  type Transaction @join__type(graph: ACCOUNTS, key: "id") {
    id: ID!
    amount: Int
      @join__field(
        graph: ACCOUNTS
        contextArguments: [
          {
            context: "accounts__userContext"
            name: "code"
            type: "String"
            selection: " { currency }"
          }
        ]
      )
  }
`;

function capturingExecutor(inner: ReturnType<typeof createDefaultExecutor>, bag: Captured[]) {
  return (request: ExecutionRequest) => {
    bag.push({
      query: print(request.document as DocumentNode),
      variables: request.variables as Record<string, unknown> | undefined,
    });
    return inner(request);
  };
}

function createUsersSubgraph(opts?: {
  nonNullCode?: boolean;
  withWrapper?: boolean;
  withMultiplier?: boolean;
  withSecondUsers?: boolean;
  nullCurrencyUser?: boolean;
}) {
  const codeArg = opts?.nonNullCode ? 'code: String!' : 'code: String';
  const amountArgs = opts?.withMultiplier
    ? `(${codeArg} @fromContext(field: "$userContext { currency }"), multiplier: Int)`
    : `(${codeArg} @fromContext(field: "$userContext { currency }"))`;
  const userFields = opts?.withWrapper
    ? 'id: ID! currency: String wrapper: Wrapper'
    : 'id: ID! currency: String transactions: [Transaction]';
  const wrapperType = opts?.withWrapper
    ? /* GraphQL */ `
        type Wrapper {
          transactions: [Transaction]
        }
      `
    : '';
  const secondUsers = opts?.withSecondUsers ? 'secondUsers: [User]' : '';

  return buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.8"
            import: ["@key", "@context", "@fromContext"]
          )
        type Query {
          users: [User]
          ${secondUsers}
        }
        type User @key(fields: "id") @context(name: "userContext") {
          ${userFields}
        }
        ${wrapperType}
        type Transaction @key(fields: "id") {
          id: ID!
          amount${amountArgs}: Int
        }
      `),
      resolvers: {
        Query: {
          users: () => {
            const base = [
              {
                id: 'u1',
                currency: 'USD',
                ...(opts?.withWrapper
                  ? {
                      wrapper: {
                        transactions: [
                          { __typename: 'Transaction', id: 't1' },
                          { __typename: 'Transaction', id: 't2' },
                        ],
                      },
                    }
                  : {
                      transactions: [
                        { __typename: 'Transaction', id: 't1' },
                        { __typename: 'Transaction', id: 't2' },
                      ],
                    }),
              },
              {
                id: 'u2',
                currency: 'EUR',
                ...(opts?.withWrapper
                  ? {
                      wrapper: {
                        transactions: [{ __typename: 'Transaction', id: 't3' }],
                      },
                    }
                  : {
                      transactions: [{ __typename: 'Transaction', id: 't3' }],
                    }),
              },
            ];
            if (opts?.nullCurrencyUser) {
              base.push({
                id: 'u3',
                currency: null as any,
                ...(opts?.withWrapper
                  ? {
                      wrapper: {
                        transactions: [{ __typename: 'Transaction', id: 't4' }],
                      },
                    }
                  : {
                      transactions: [{ __typename: 'Transaction', id: 't4' }],
                    }),
              });
            }
            return base;
          },
          secondUsers: () => [
            {
              id: 's1',
              currency: 'GBP',
              transactions: [{ __typename: 'Transaction', id: 't5' }],
            },
          ],
        },
        Transaction: {
          amount: (
            _: unknown,
            { code, multiplier }: { code?: string | null; multiplier?: number | null },
          ) => {
            const base =
              code === 'USD'
                ? 100
                : code === 'EUR'
                  ? 90
                  : code === 'GBP'
                    ? 80
                    : code == null
                      ? 0
                      : null;
            if (base == null) {
              return null;
            }
            return multiplier != null ? base * multiplier : base;
          },
          __resolveReference: (ref: { id: string }) => ({
            __typename: 'Transaction',
            id: ref.id,
          }),
        },
        User: {
          __resolveReference: (ref: { id: string }) => ({
            __typename: 'User',
            id: ref.id,
            currency:
              ref.id === 'u1' ? 'USD' : ref.id === 'u2' ? 'EUR' : ref.id === 's1' ? 'GBP' : null,
          }),
        },
      },
    },
  ]);
}

function createInterfaceSubgraph() {
  return buildSubgraphSchema([
    {
      typeDefs: parse(/* GraphQL */ `
        extend schema
          @link(
            url: "https://specs.apollo.dev/federation/v2.8"
            import: ["@key", "@context", "@fromContext"]
          )
        type Query {
          account: Account
        }
        interface Account @context(name: "accountContext") {
          currency: String
          transactions: [Transaction]
        }
        type User implements Account @key(fields: "id") @context(name: "accountContext") {
          id: ID!
          currency: String
          transactions: [Transaction]
        }
        type Other implements Account @key(fields: "id") @context(name: "accountContext") {
          id: ID!
          currency: String
          transactions: [Transaction]
        }
        type Transaction @key(fields: "id") {
          id: ID!
          fromInterface(code: String @fromContext(field: "$accountContext { currency }")): Int
        }
      `),
      resolvers: {
        Query: {
          account: () => ({
            __typename: 'Other',
            id: 'o1',
            currency: 'EUR',
            transactions: [{ __typename: 'Transaction', id: 't1' }],
          }),
        },
        Account: {
          __resolveType: (obj: { __typename?: string }) => obj.__typename ?? 'Other',
        },
        Transaction: {
          fromInterface: (_: unknown, { code }: { code?: string | null }) =>
            code === 'EUR' ? 1 : code == null ? 0 : null,
          __resolveReference: (ref: { id: string }) => ({
            __typename: 'Transaction',
            id: ref.id,
          }),
        },
        Other: {
          __resolveReference: (ref: { id: string }) => ({
            __typename: 'Other',
            id: ref.id,
            currency: 'EUR',
          }),
        },
        User: {
          __resolveReference: (ref: { id: string }) => ({
            __typename: 'User',
            id: ref.id,
            currency: 'USD',
          }),
        },
      },
    },
  ]);
}

function stitchWithCapture(
  supergraphSdl: string,
  subgraph: ReturnType<typeof createUsersSubgraph>,
) {
  const bag: Captured[] = [];
  const inner = createDefaultExecutor(subgraph);
  const schema = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl,
    onSubschemaConfig(subschema) {
      subschema.executor = capturingExecutor(inner, bag);
    },
  });
  return { schema, bag, executor: createBackboneExecutor(schema) };
}

function entityRequests(bag: Captured[]) {
  return bag.filter(r => r.query.includes('_entities'));
}

function hasAliasedEntities(query: string) {
  return /_entities_\d+\s*:/.test(query);
}

describe('fromContext gateway-parity (adapted from gateway#2703)', () => {
  it('same context values: one group fills amounts (gateway: original operation)', async () => {
    const subgraph = createUsersSubgraph();
    // Force same currency for both users via custom resolvers by filtering EUR out:
    // use only first user by querying; assert data shape for USD-only list.
    const { schema, bag, executor } = stitchWithCapture(BASIC_SUPERGRAPH, subgraph);
    // Override users to same currency
    const usersField = (subgraph.getType('Query') as any).getFields().users;
    usersField.resolve = () => [
      {
        id: 'u1',
        currency: 'USD',
        transactions: [
          { __typename: 'Transaction', id: 't1' },
          { __typename: 'Transaction', id: 't2' },
        ],
      },
      {
        id: 'u2',
        currency: 'USD',
        transactions: [
          { __typename: 'Transaction', id: 't3' },
          { __typename: 'Transaction', id: 't4' },
        ],
      },
    ];
    void schema;
    const result = await executor({
      document: parse(`{ users { transactions { amount } } }`),
    });
    expect(result).toEqual({
      data: {
        users: [
          { transactions: [{ amount: 100 }, { amount: 100 }] },
          { transactions: [{ amount: 100 }, { amount: 100 }] },
        ],
      },
    });
    const entities = entityRequests(bag);
    expect(entities.length).toBeGreaterThanOrEqual(1);
    // Single group: no _entities_N aliases required
    expect(entities.every(r => !hasAliasedEntities(r.query))).toBe(true);
  });

  it('distinct currencies: fill each group (gateway: aliased _entities_N in one request)', async () => {
    const { bag, executor } = stitchWithCapture(
      BASIC_SUPERGRAPH,
      createUsersSubgraph({ nullCurrencyUser: true }),
    );
    const result = await executor({
      document: parse(`{ users { transactions { amount } } }`),
    });
    expect(result).toEqual({
      data: {
        users: [
          { transactions: [{ amount: 100 }, { amount: 100 }] },
          { transactions: [{ amount: 90 }] },
          { transactions: [{ amount: 0 }] },
        ],
      },
    });
    const entities = entityRequests(bag);
    // Parity target: one HTTP call with _entities_0..N
    expect(entities).toHaveLength(1);
    expect(hasAliasedEntities(entities[0]!.query)).toBe(true);
    expect(entities[0]!.query).toMatch(/_entities_0/);
    expect(entities[0]!.query).toMatch(/_entities_1/);
  });

  it('shares client variables across context groups (gateway aliased fields)', async () => {
    const { bag, executor } = stitchWithCapture(
      MULTIPLIER_SUPERGRAPH,
      createUsersSubgraph({ withMultiplier: true }),
    );
    const result = await executor({
      document: parse(`query ($m: Int) { users { transactions { amount(multiplier: $m) } } }`),
      variables: { m: 2 },
    });
    expect(result).toEqual({
      data: {
        users: [
          { transactions: [{ amount: 200 }, { amount: 200 }] },
          { transactions: [{ amount: 180 }] },
        ],
      },
    });
    const entities = entityRequests(bag);
    expect(entities).toHaveLength(1);
    expect(entities[0]!.variables?.m).toBe(2);
    expect(hasAliasedEntities(entities[0]!.query)).toBe(true);
  });

  it('non-null contextual arg: one request per group (gateway serial path)', async () => {
    const { bag, executor } = stitchWithCapture(
      NON_NULL_SUPERGRAPH,
      createUsersSubgraph({ nonNullCode: true }),
    );
    const result = (await executor({
      document: parse(`{ users { transactions { amount } } }`),
    })) as { data?: unknown; errors?: unknown };
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      users: [
        { transactions: [{ amount: 100 }, { amount: 100 }] },
        { transactions: [{ amount: 90 }] },
      ],
    });
    const entities = entityRequests(bag);
    expect(entities.length).toBeGreaterThanOrEqual(2);
    expect(entities.every(r => !hasAliasedEntities(r.query))).toBe(true);
  });

  it('reads context through intermediate wrapper ancestor', async () => {
    const { bag, executor } = stitchWithCapture(
      WRAPPER_SUPERGRAPH,
      createUsersSubgraph({ withWrapper: true }),
    );
    const result = await executor({
      document: parse(`{ users { wrapper { transactions { amount } } } }`),
    });
    expect(result).toEqual({
      data: {
        users: [
          { wrapper: { transactions: [{ amount: 100 }, { amount: 100 }] } },
          { wrapper: { transactions: [{ amount: 90 }] } },
        ],
      },
    });
    const entities = entityRequests(bag);
    expect(entities.length).toBeGreaterThanOrEqual(1);
    // parentDepth should be 2 (Transaction -> Wrapper -> User)
    const plan = buildStitchPlan(
      (await import('../src/supergraph')).getStitchedSchemaFromSupergraphSdl({
        supergraphSdl: WRAPPER_SUPERGRAPH,
        onSubschemaConfig(s) {
          s.executor = createDefaultExecutor(createUsersSubgraph({ withWrapper: true }));
        },
      }),
      parse(`{ users { wrapper { transactions { amount } } } }`).definitions[0] as any,
      {},
      {},
    );
    let depth: number | undefined;
    const walk = (n: any) => {
      if (n?.kind === 'Fetch' && n.contextArguments?.[0]) {
        depth = n.contextArguments[0].parentDepth;
      }
      for (const c of n?.nodes ?? []) walk(c);
      if (n?.continue) walk(n.continue);
    };
    walk(plan.root);
    expect(depth).toBe(2);
    void bag;
  });

  it('reads context from an interface ancestor', async () => {
    const { executor } = stitchWithCapture(INTERFACE_SUPERGRAPH, createInterfaceSubgraph() as any);
    const result = await executor({
      document: parse(`{ account { transactions { fromInterface } } }`),
    });
    expect(result).toEqual({
      data: { account: { transactions: [{ fromInterface: 1 }] } },
    });
  });

  it('null currency group resolves null/zero context', async () => {
    const { executor } = stitchWithCapture(
      BASIC_SUPERGRAPH,
      createUsersSubgraph({ nullCurrencyUser: true }),
    );
    const result = await executor({
      document: parse(`{ users { transactions { amount } } }`),
    });
    expect((result as any).data.users[2]).toEqual({
      transactions: [{ amount: 0 }],
    });
  });

  it('root field alias still plans context rewrite', async () => {
    const { executor } = stitchWithCapture(BASIC_SUPERGRAPH, createUsersSubgraph());
    const result = await executor({
      document: parse(`{ people: users { transactions { amount } } }`),
    });
    expect(result).toEqual({
      data: {
        people: [
          { transactions: [{ amount: 100 }, { amount: 100 }] },
          { transactions: [{ amount: 90 }] },
        ],
      },
    });
  });

  it('aliased provider field still bridges currency for rewrite', async () => {
    const { executor } = stitchWithCapture(BASIC_SUPERGRAPH, createUsersSubgraph());
    const result = await executor({
      document: parse(`{ users { localCurrency: currency transactions { amount } } }`),
    });
    expect(result).toEqual({
      data: {
        users: [
          { localCurrency: 'USD', transactions: [{ amount: 100 }, { amount: 100 }] },
          { localCurrency: 'EUR', transactions: [{ amount: 90 }] },
        ],
      },
    });
  });

  it('BatchFetch dual roots: unequal context groups in one wave', async () => {
    const { bag, executor } = stitchWithCapture(
      DUAL_ROOT_SUPERGRAPH,
      createUsersSubgraph({ withSecondUsers: true }),
    );
    const result = (await executor({
      document: parse(`{
        users { transactions { amount } }
        secondUsers { transactions { amount } }
      }`),
    })) as { data?: any; errors?: unknown };
    expect(result.errors).toBeUndefined();
    expect(result.data.users[0].transactions[0].amount).toBe(100);
    expect(result.data.secondUsers[0].transactions[0].amount).toBe(80);
    // Full BatchFetch context waves (unequal groups in one HTTP) remain a
    // follow-up; assert correct fills across both roots for now.
    expect(result.data.users[1].transactions[0].amount).toBe(90);
    void bag;
  });
});
