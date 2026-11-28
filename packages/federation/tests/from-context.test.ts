import { parse, print } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { buildStitchPlan, createBackboneExecutor } from '@graphql-tools/stitch';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

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
