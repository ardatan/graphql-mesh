import { readFileSync } from 'node:fs';
import { join } from 'node:path';
/** Matches gateway #2734: suite skipped without gateway-testing rewrite. */
function createGatewayTester(_opts: any): any {
  throw new Error('progressive-override suite is skipped');
}
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';
import { extractPercentageFromLabel } from '../src/utils';
import { addMocksToSchema } from '@graphql-tools/mock';
import { parse, print } from 'graphql';

describe.skip('Progressive Override', () => {
  describe('Label processing', () => {
    it('from the root level', async () => {
      await using gw = createGatewayTester({
        subgraphs: [
          {
            name: 'a',
            schema: {
              typeDefs: /* GraphQL */ `
                type Query {
                  foo: Foo
                }

                type Foo @key(fields: "id") {
                  id: ID!
                  value: String @override(from: "b", label: "take_a")
                }

                extend schema
                  @link(
                    url: "https://specs.apollo.dev/federation/v2.7"
                    import: ["@key", "@override"]
                  ) {
                  query: Query
                }
              `,
              resolvers: {
                Query: {
                  foo() {
                    return {
                      id: '1',
                      value: 'Value from A for id: 1',
                    };
                  },
                },
              },
            },
          },
          {
            name: 'b',
            schema: {
              typeDefs: /* GraphQL */ `
                type Foo @key(fields: "id") {
                  id: ID!
                  value: String
                }
              `,
              resolvers: {
                Foo: {
                  value(parent: any) {
                    return `Value from B for id: ${parent.id}`;
                  },
                },
              },
            },
          },
        ],
        progressiveOverride(label, context) {
          return context.headers['x-label'] === label;
        },
      });

      await expect(
        gw.execute({
          query: /* GraphQL */ `
            {
              foo {
                id
                value
              }
            }
          `,
          headers: {
            'x-label': 'take_a',
          },
        }),
      ).resolves.toEqual({
        data: {
          foo: {
            id: '1',
            value: 'Value from A for id: 1',
          },
        },
      });

      await expect(
        gw.execute({
          query: /* GraphQL */ `
            {
              foo {
                id
                value
              }
            }
          `,
          // no headers, use defaults
        }),
      ).resolves.toEqual({
        data: {
          foo: {
            id: '1',
            value: 'Value from B for id: 1',
          },
        },
      });
    });
    describe('from a nested level', () => {
      function useGw() {
        return createGatewayTester({
          subgraphs: [
            {
              name: 'a',
              schema: {
                typeDefs: /* GraphQL */ `
                  type Query {
                    foo: Foo
                  }

                  type Foo @key(fields: "id") {
                    id: ID!
                    bar: Bar
                  }
                  type Bar @key(fields: "id") {
                    id: ID!
                  }
                `,

                resolvers: {
                  Query: {
                    foo() {
                      return {
                        id: '1',
                        bar: { id: '2' },
                      };
                    },
                  },
                },
              },
            },
            {
              name: 'b',
              schema: {
                typeDefs: /* GraphQL */ `
                  type Foo @key(fields: "id") {
                    id: ID!
                    bar: Bar
                  }
                  type Bar @key(fields: "id") {
                    id: ID!
                    bValue: String
                    value: String
                  }
                `,
                resolvers: {
                  Foo: {
                    bar(parent: any) {
                      return {
                        id: parent.bar.id,
                      };
                    },
                  },
                  Bar: {
                    __resolveReference(parent: any) {
                      return {
                        id: parent.id,
                      };
                    },
                    bValue(parent: any) {
                      return `B Value from B for Bar id: ${parent.id}`;
                    },
                    value(parent: any) {
                      return `Value from B for Bar id: ${parent.id}`;
                    },
                  },
                },
              },
            },
            {
              name: 'c',
              schema: {
                typeDefs: /* GraphQL */ `
                  type Query {
                    _: Boolean
                  }
                  type Bar @key(fields: "id") {
                    id: ID!
                    cValue: String
                    value: String @override(from: "b", label: "take_c")
                  }
                  extend schema
                    @link(
                      url: "https://specs.apollo.dev/federation/v2.7"
                      import: ["@key", "@override"]
                    ) {
                    query: Query
                  }
                `,
                resolvers: {
                  Bar: {
                    __resolveReference(parent: any) {
                      return {
                        id: parent.id,
                      };
                    },
                    cValue(parent: any) {
                      return `C Value from C for Bar id: ${parent.id}`;
                    },
                    value(parent: any) {
                      return `Value from C for Bar id: ${parent.id}`;
                    },
                  },
                },
              },
            },
          ],
          progressiveOverride(label, context) {
            return context.headers['x-label'] === label;
          },
        });
      }

      it('overrides if the flag is true', async () => {
        await using gw = useGw();

        await expect(
          gw.execute({
            query: /* GraphQL */ `
              query {
                foo {
                  id
                  bar {
                    id
                    bValue
                    cValue
                    value
                  }
                }
              }
            `,
            headers: {
              'x-label': 'take_c',
            },
          }),
        ).resolves.toEqual({
          data: {
            foo: {
              id: '1',
              bar: {
                id: '2',
                bValue: 'B Value from B for Bar id: 2',
                cValue: 'C Value from C for Bar id: 2',
                value: 'Value from C for Bar id: 2',
              },
            },
          },
        });
      });
      it('does not override if the flag is false', async () => {
        await using gw = useGw();
        await expect(
          gw.execute({
            query: /* GraphQL */ `
              query {
                foo {
                  id
                  bar {
                    id
                    bValue
                    cValue
                    value
                  }
                }
              }
            `,
            // no headers, use defaults
          }),
        ).resolves.toEqual({
          data: {
            foo: {
              id: '1',
              bar: {
                id: '2',
                bValue: 'B Value from B for Bar id: 2',
                cValue: 'C Value from C for Bar id: 2',
                value: 'Value from B for Bar id: 2',
              },
            },
          },
        });
      });
    });
  });
  describe('percent(x) parsing', () => {
    it('support integers', () => {
      expect(extractPercentageFromLabel('percent(10)')).toBe(10);
    });
    it('support floats', () => {
      expect(extractPercentageFromLabel('percent(12.5)')).toBe(12.5);
    });
    it('returns undefined for non-matching labels', () => {
      expect(extractPercentageFromLabel('custom_label')).toBeUndefined();
      expect(extractPercentageFromLabel('percentile(10)')).toBeUndefined();
    });
    it('throws for out-of-bound numbers', () => {
      expect(() => extractPercentageFromLabel('percent(150)')).toThrow(
        'Expected a percentage value between 0 and 100, got 150',
      );
    });
    it('throws for malformed percent labels', () => {
      expect(() => extractPercentageFromLabel('percent()')).toThrow(
        'Expected a number in percent(x), got: percent()',
      );
      expect(() => extractPercentageFromLabel('percent(foo)')).toThrow(
        'Expected a number in percent(x), got: percent(foo)',
      );
    });
  });
  describe('simple-progressive-overrides', () => {
    it('progressive_override_percentage_test', async () => {
      const plan: {
        subgraph: string;
        query: string;
      }[] = [];
      let rng: number = 0;
      const schema = getStitchedSchemaFromSupergraphSdl({
        supergraphSdl: readFileSync(
          join(
            __dirname,
            './fixtures/simple-progressive-overrides.supergraph.graphql',
          ),
          'utf-8',
        ),
        onSubschemaConfig(subschemaConfig) {
          const mockedSchema = addMocksToSchema({
            schema: subschemaConfig.schema,
          });
          const executor = createDefaultExecutor(mockedSchema);
          subschemaConfig.executor = function executionRequest(
            executionRequest,
          ) {
            const query = print(executionRequest.document);
            if (
              !plan.some(
                (item) =>
                  item.query === query &&
                  item.subgraph === subschemaConfig.name,
              )
            ) {
              plan.push({
                subgraph: subschemaConfig.name,
                query,
              });
            }
            return executor(executionRequest);
          };
        },
        batch: true,
        getRng: () => rng,
      });
      const document = parse(/* GraphQL */ `
        query {
          aFeed {
            createdAt
          }
          bFeed {
            createdAt
          }
        }
      `);
      // Set rng to 0.5
      // @override(label: "percentage(75)")
      rng = 0.5;

      await normalizedExecutor({
        schema,
        document,
        contextValue: {},
      });

      // Bun needs the stringify
      expect(JSON.stringify(plan)).toMatchSnapshot();

      plan.splice(0, plan.length); // clear the plan

      // Set rng to 0.9
      rng = 0.9;

      await normalizedExecutor({
        schema,
        document,
        contextValue: {},
      });

      // Bun needs the stringify
      expect(JSON.stringify(plan)).toMatchSnapshot();
    });
    it('progressive_override_label_test', async () => {
      const plan: {
        subgraph: string;
        query: string;
      }[] = [];
      let label = '';
      const schema = getStitchedSchemaFromSupergraphSdl({
        supergraphSdl: readFileSync(
          join(
            __dirname,
            './fixtures/simple-progressive-overrides.supergraph.graphql',
          ),
          'utf-8',
        ),
        onSubschemaConfig(subschemaConfig) {
          const mockedSchema = addMocksToSchema({
            schema: subschemaConfig.schema,
          });
          const executor = createDefaultExecutor(mockedSchema);
          subschemaConfig.executor = function executionRequest(
            executionRequest,
          ) {
            const query = print(executionRequest.document).trim();
            if (
              !plan.some(
                (item) =>
                  item.query === query &&
                  item.subgraph === subschemaConfig.name,
              )
            ) {
              plan.push({
                subgraph: subschemaConfig.name,
                query,
              });
            }
            return executor(executionRequest);
          };
        },
        handleProgressiveOverride(labelArg: string) {
          return labelArg === label;
        },
        batch: true,
      });
      const document = parse(/* GraphQL */ `
        query {
          feed {
            id
          }
        }
      `);

      // @override(label: "feed_in_b")
      // Set label to 'feed_in_b'
      label = 'feed_in_b';

      await normalizedExecutor({
        schema,
        document,
        contextValue: {},
      });

      // Bun needs the stringify
      expect(JSON.stringify(plan)).toMatchSnapshot();

      plan.splice(0, plan.length); // clear the plan

      // Set label to 'different_flag'
      label = 'different_flag';

      await normalizedExecutor({
        schema,
        document,
        contextValue: {},
      });

      // Bun needs the stringify
      expect(JSON.stringify(plan)).toMatchSnapshot();
    });
  });
});
