import {
  buildSchema,
  DocumentNode,
  getOperationAST,
  GraphQLObjectType,
  Kind,
  parse,
} from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { inspect, isAsyncIterable, printSchemaWithDirectives } from '@graphql-tools/utils';
import { assertAsyncIterable, assertNonAsyncIterable } from '../../../legacy/testing/utils.js';
import {
  createExecutableResolverOperationNode,
  executeResolverOperationNode,
} from '../src/execution.js';
import { extractSubgraphFromFusiongraph } from '../src/extractSubgraph.js';
import { FlattenedFieldNode, FlattenedSelectionSet } from '../src/flattenSelections.js';
import {
  createExecutablePlanForOperation,
  executeOperation,
  executeOperationPlan,
  executeOperationWithPatches,
  planOperation,
  serializeExecutableOperationPlan,
} from '../src/operations.js';
import { parseAndCache, printCached } from '../src/parseAndPrintWithCache.js';
import {
  createResolveNode,
  ResolverOperationNode,
  visitFieldNodeForTypeResolvers,
} from '../src/query-planning.js';
import { serializeResolverOperationNode } from '../src/serialization.js';

describe('Query Planning', () => {
  describe('visitForTypeResolver', () => {
    it('resolves a type from a different subgraph with missing fields on one level', () => {
      const fieldNodeInText = /* GraphQL */ `
      myFoo {
        baz
      }
    `;

      const operationInText = /* GraphQL */ `
      query Test {
        ${fieldNodeInText}
      }
    `;

      const operationDoc = parseAndCache(operationInText);

      const operationAst = getOperationAST(operationDoc, 'Test');

      const selections = operationAst!.selectionSet.selections as FlattenedFieldNode[];

      const { newFieldNode, resolverOperationDocument } = createResolveNode({
        parentSubgraph: 'A',
        fieldNode: selections[0],
        resolverOperationString: /* GraphQL */ `
          query FooFromB($Foo_id: ID!) {
            foo(id: $Foo_id)
          }
        `,
        variableDirectives: [
          {
            name: 'Foo_id',
            select: 'id',
            subgraph: 'A',
          },
        ],
        resolverSelections: selections[0].selectionSet?.selections as FlattenedFieldNode[],
        resolverArguments: selections[0].arguments,
        ctx: { currentVariableIndex: 0, rootVariableMap: new Map() },
      });

      expect(printCached(newFieldNode)).toBe('myFoo {\n  baz\n  __variable_0: id\n}');
      expect(printCached(resolverOperationDocument)).toBe(
        /* GraphQL */ `
query FooFromB($__variable_0: ID!) {
  __export: foo(id: $__variable_0) {
    baz
  }
}
    `.trim(),
      );
    });
    it('resolves a field on one level', () => {
      const fieldNodeInText = /* GraphQL */ `
      extraField {
        baz
      }
    `;

      const operationInText = /* GraphQL */ `
      query Test {
        myFoo {
          ${fieldNodeInText}
        }
      }
    `;

      const operationDoc = parseAndCache(operationInText);

      const operationAst = getOperationAST(operationDoc, 'Test');

      const selections = operationAst!.selectionSet.selections as FlattenedFieldNode[];

      const myFooSelection = selections[0];

      const extraFieldSelection = myFooSelection.selectionSet!.selections[0] as FlattenedFieldNode;

      const { newFieldNode, resolverOperationDocument } = createResolveNode({
        parentSubgraph: 'A',
        fieldNode: myFooSelection,
        resolverOperationString: /* GraphQL */ `
          query ExtraFieldFromC($Foo_id: ID!) {
            extraFieldForFoo(id: $Foo_id)
          }
        `,
        variableDirectives: [
          {
            name: 'Foo_id',
            select: 'id',
            subgraph: 'A',
          },
        ],
        resolverSelections: extraFieldSelection.selectionSet!.selections as FlattenedFieldNode[],
        resolverArguments: extraFieldSelection.arguments,
        ctx: { currentVariableIndex: 0, rootVariableMap: new Map() },
      });

      expect(printCached(newFieldNode)).toBe(
        /* GraphQL */ `
myFoo {
  extraField {
    baz
  }
  __variable_0: id
}
`.trim(),
      );

      expect(printCached(resolverOperationDocument)).toBe(
        /* GraphQL */ `
query ExtraFieldFromC($__variable_0: ID!) {
  __export: extraFieldForFoo(id: $__variable_0) {
    baz
  }
}`.trim(),
      );
    });
  });
  describe('visitFieldNodeForTypeResolvers', () => {
    it('resolves a type from different subgraphs with missing fields on one level', () => {
      const fieldNodeInText = /* GraphQL */ `
      myFoo {
        bar
        baz
      }
    `;
      const typeDefInText = /* GraphQL */ `
        type Foo
          @variable(name: "Foo_id", select: "id", subgraph: "A")
          @resolver(operation: "query FooFromB($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "B")
          @resolver(operation: "query FooFromC($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "C") {
          id: ID! @source(subgraph: "A")
          bar: String! @source(subgraph: "B")
          baz: String! @source(subgraph: "C")
        }
      `;

      const schemaInText = /* GraphQL */ `
        type Query {
          myFoo: Foo!
        }

        ${typeDefInText}
      `;

      const fusiongraph = buildSchema(schemaInText, {
        assumeValid: true,
        assumeValidSDL: true,
      });

      const operationInText = /* GraphQL */ `
      query Test {
        ${fieldNodeInText}
      }
    `;

      const operationDoc = parseAndCache(operationInText);

      const operationAst = getOperationAST(operationDoc, 'Test');

      const selections = operationAst!.selectionSet.selections as FlattenedFieldNode[];

      const type = fusiongraph.getType('Foo') as GraphQLObjectType;

      const { newFieldNode, resolverOperationNodes } = visitFieldNodeForTypeResolvers(
        'A',
        selections[0],
        type,
        fusiongraph,
        { currentVariableIndex: 0, rootVariableMap: new Map() },
      );

      expect(printCached(newFieldNode)).toBe('myFoo {\n  __variable_0: id\n  __variable_1: id\n}');

      expect(resolverOperationNodes.map(serializeResolverOperationNode)).toStrictEqual([
        {
          subgraph: 'B',
          resolverOperationDocument: /* GraphQL */ `
query FooFromB($__variable_0: ID!) {
  __export: foo(id: $__variable_0) {
    bar
  }
}
        `.trim(),
        },
        {
          subgraph: 'C',
          resolverOperationDocument: /* GraphQL */ `
query FooFromC($__variable_1: ID!) {
  __export: foo(id: $__variable_1) {
    baz
  }
}
        `.trim(),
        },
      ]);
    });
    it('resolves a type from different subgraphs with missing fields on nested levels', () => {
      const fieldNodeInText = /* GraphQL */ `
      myFoo {
        bar
        baz
        child {
          bar
          child {
            bar
          }
        }
      }
    `;
      const typeDefInText = /* GraphQL */ `
        type Foo
          @variable(name: "Foo_id", select: "id", subgraph: "A")
          @variable(name: "Foo_id", select: "id", subgraph: "B")
          @variable(name: "Foo_id", select: "id", subgraph: "C")
          @resolver(operation: "query FooFromB($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "B")
          @resolver(operation: "query FooFromC($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "C") {
          id: ID! @source(subgraph: "A") @source(subgraph: "B") @source(subgraph: "C")
          bar: String! @source(subgraph: "B")
          baz: String! @source(subgraph: "C")
          child: Foo @source(subgraph: "C")
        }
      `;

      const schemaInText = /* GraphQL */ `
        type Query {
          myFoo: Foo!
        }

        ${typeDefInText}
      `;

      const fusiongraph = buildSchema(schemaInText, {
        assumeValid: true,
        assumeValidSDL: true,
      });

      const operationInText = /* GraphQL */ `
      query Test {
        ${fieldNodeInText}
      }
    `;

      const operationDoc = parseAndCache(operationInText);

      const operationAst = getOperationAST(operationDoc, 'Test');

      const selections = operationAst!.selectionSet.selections as FlattenedFieldNode[];

      const type = fusiongraph.getType('Foo') as GraphQLObjectType;

      const { newFieldNode, resolverOperationNodes } = visitFieldNodeForTypeResolvers(
        'A',
        selections[0],
        type,
        fusiongraph,
        { currentVariableIndex: 0, rootVariableMap: new Map() },
      );
      /*
      for (const node of resolverOperationNodes) {
        console.log(inspect(serializeNode(node), undefined, Infinity))
      }
  */
      expect(printCached(newFieldNode)).toBe('myFoo {\n  __variable_0: id\n  __variable_1: id\n}');

      expect(resolverOperationNodes.map(serializeResolverOperationNode)).toStrictEqual([
        {
          subgraph: 'B',
          resolverOperationDocument: /* GraphQL */ `
query FooFromB($__variable_0: ID!) {
  __export: foo(id: $__variable_0) {
    bar
  }
}
        `.trim(),
        },
        {
          subgraph: 'C',
          resolverOperationDocument: /* GraphQL */ `
query FooFromC($__variable_1: ID!) {
  __export: foo(id: $__variable_1) {
    baz
    child {
      child {
        __variable_2: id
      }
      __variable_3: id
    }
  }
}
        `.trim(),
          resolverDependencyFieldMap: {
            child: [
              {
                subgraph: 'B',
                resolverOperationDocument: /* GraphQL */ `
query FooFromB($__variable_3: ID!) {
  __export: foo(id: $__variable_3) {
    bar
  }
}`.trim(),
              },
            ],
            'child.child': [
              {
                subgraph: 'B',
                resolverOperationDocument: /* GraphQL */ `
query FooFromB($__variable_2: ID!) {
  __export: foo(id: $__variable_2) {
    bar
  }
}`.trim(),
              },
            ],
          },
        },
      ]);
    });
    it('resolves a field on root level', () => {
      const operationInText = /* GraphQL */ `
        query Test {
          myFoo {
            bar
          }
        }
      `;

      const operationDoc = parseAndCache(operationInText);

      const operationAst = getOperationAST(operationDoc, 'Test');

      const selectionSet = operationAst!.selectionSet as FlattenedSelectionSet;

      const fakeFieldNode: FlattenedFieldNode = {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: '__fake',
        },
        selectionSet,
      };

      const fusiongraph = buildSchema(
        /* GraphQL */ `
          type Query {
            myFoo: Foo! @resolver(operation: "query MyFooFromA { myFoo }", subgraph: "A")
          }

          type Foo @source(subgraph: "A") {
            bar: String! @source(subgraph: "A")
          }
        `,
        {
          assumeValid: true,
          assumeValidSDL: true,
        },
      );

      const { newFieldNode, resolverOperationNodes, resolverDependencyFieldMap } =
        visitFieldNodeForTypeResolvers(
          'DUMMY',
          fakeFieldNode,
          fusiongraph.getQueryType()!,
          fusiongraph,
          { currentVariableIndex: 0, rootVariableMap: new Map() },
        );

      expect(printCached(newFieldNode)).toBe(`__fake`);

      expect(resolverOperationNodes.map(serializeResolverOperationNode)).toStrictEqual([]);

      const resolverDependencyMapEntries = [...resolverDependencyFieldMap];
      expect(
        Object.fromEntries(
          resolverDependencyMapEntries.map(([key, value]) => [
            key,
            value.map(serializeResolverOperationNode),
          ]),
        ),
      ).toStrictEqual({
        myFoo: [
          {
            resolverOperationDocument: /* GraphQL */ `
query MyFooFromA {
  __export: myFoo {
    bar
  }
}`.trim(),
            subgraph: 'A',
          },
        ],
      });
    });

    it('respects arguments', () => {
      const operationInText = /* GraphQL */ `
        query Test {
          foo(id: 1) {
            bar
          }
        }
      `;

      const fusiongraphInText = /* GraphQL */ `
        type Query {
          foo(id: ID!): Foo!
            @resolver(operation: "query FooFromA($id: ID!) { foo(id: $id) }", subgraph: "A")
        }

        type Foo @source(subgraph: "A") {
          bar: String! @source(subgraph: "A")
        }
      `;

      const fusiongraph = buildSchema(fusiongraphInText, {
        assumeValid: true,
        assumeValidSDL: true,
      });

      const operationDoc = parseAndCache(operationInText);

      const plan = planOperation(fusiongraph, operationDoc, 'Test');

      expect(
        Object.fromEntries(
          [...plan.resolverDependencyFieldMap.entries()].map(([key, value]) => [
            key,
            value.map(serializeResolverOperationNode),
          ]),
        ),
      ).toMatchObject({
        foo: [
          {
            subgraph: 'A',
            resolverOperationDocument:
              'query FooFromA {\n' + '  __export: foo(id: 1) {\n' + '    bar\n' + '  }\n' + '}',
          },
        ],
      });
    });

    it('handles global resolvers', () => {
      const operationInText = /* GraphQL */ `
        query Test {
          me {
            id
            name
          }
        }
      `;

      const fusiongraphInText = /* GraphQL */ `
        schema
          @resolver(
            name: "userResolver"
            operation: "query UserResolver($User_id: ID!) { user(id: $User_id) }"
            subgraph: "B"
            kind: FETCH
          ) {
          query: Query
        }
        type Query {
          me: User! @resolver(subgraph: "A", operation: "query MeFromA { me }", kind: FETCH)
        }

        type User
          @source(subgraph: "A")
          @source(subgraph: "B")
          @resolver(name: "userResolver", subgraph: "B")
          @variable(name: "User_id", select: "id", subgraph: "A") {
          id: ID! @source(subgraph: "A") @source(subgraph: "B")
          name: String! @source(subgraph: "B")
        }
      `;

      const fusiongraph = buildSchema(fusiongraphInText, {
        assumeValid: true,
        assumeValidSDL: true,
      });

      const operationDoc = parseAndCache(operationInText);

      const plan = planOperation(fusiongraph, operationDoc, 'Test');

      expect(
        Object.fromEntries(
          [...plan.resolverDependencyFieldMap.entries()].map(([key, value]) => [
            key,
            value.map(serializeResolverOperationNode),
          ]),
        ),
      ).toEqual({
        me: [
          {
            resolverDependencies: [
              {
                resolverOperationDocument: /* GraphQL */ `
query UserResolver($__variable_0: ID!) {
  __export: user(id: $__variable_0) {
    name
  }
}
                `.trim(),
                subgraph: 'B',
              },
            ],
            resolverOperationDocument: /* GraphQL */ `
query MeFromA {
  __export: me {
    id
    __variable_0: id
  }
}
            `.trim(),
            subgraph: 'A',
          },
        ],
      });
    });
  });
});

describe('Execution', () => {
  const aSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        myFoo: Foo!
        foos: [Foo!]!
      }

      type Subscription {
        onFoo: Foo!
      }

      type Foo {
        id: ID!
      }
    `,
    resolvers: {
      Query: {
        myFoo: () => ({
          id: 'A_FOO_ID',
        }),
        foos: () => [
          {
            id: 'A_FOO_ID_0',
          },
          {
            id: 'A_FOO_ID_1',
          },
        ],
      },
      Subscription: {
        onFoo: {
          subscribe: async function* () {
            yield {
              onFoo: {
                id: 'A_FOO_ID_0',
              },
            };
            await new Promise(resolve => setTimeout(resolve, 1000));
            yield {
              onFoo: {
                id: 'A_FOO_ID_1',
              },
            };
          },
        },
      },
    },
  });

  const bSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        foo(id: ID!): Foo!
      }

      type Foo {
        id: ID!
        bar: String!
        corge: String!
      }
    `,
    resolvers: {
      Query: {
        foo: (_, { id }) => ({
          id,
        }),
      },
      Foo: {
        bar: ({ id }) => `B_BAR_FOR_${id}`,
        corge: ({ id }) => `B_CORGE_FOR_${id}`,
      },
    },
  });

  const cSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        foo(id: ID!): Foo!
      }

      type Foo {
        id: ID!
        baz: String!
        child: Foo
        children: [Foo!]!
      }
    `,
    resolvers: {
      Query: {
        foo: (_, { id }) => ({ id }),
      },
      Foo: {
        child: ({ id }) => ({
          id: `C_CHILD_ID_FOR_${id}`,
        }),
        baz: ({ id }) => `C_BAZ_FOR_${id}`,
        children: ({ id }) => [
          {
            id: `C_CHILD_ID_0_FOR_${id}`,
          },
          {
            id: `C_CHILD_ID_1_FOR_${id}`,
          },
        ],
      },
    },
  });

  const dSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Foo {
        id: ID!
        qux: String!
      }

      type Query {
        foos(ids: [ID!]!): [Foo!]!
      }
    `,
    resolvers: {
      Query: {
        foos: (_, { ids }) => {
          return ids.map((id: any) => ({
            id,
          }));
        },
      },
      Foo: {
        qux: ({ id }) => `D_QUX_FOR_${id}`,
      },
    },
  });

  const eSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Foo {
        id: ID!
        computedFromBaz: String!
      }

      type Query {
        fooWithComputedFromBaz(id: ID!, baz: String): Foo!
      }
    `,
    resolvers: {
      Query: {
        fooWithComputedFromBaz: (_, { id, baz }) => ({
          id,
          baz,
        }),
      },
      Foo: {
        computedFromBaz: ({ id, baz }) => {
          if (!baz) {
            throw new Error('baz is required');
          }
          return `E_COMPUTED_FROM_BAZ_FOR_${id}_AND_${baz}`;
        },
      },
    },
  });

  const fSchema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      input FooObj {
        id: ID!
      }

      type Foo {
        id: ID!
        grault: String!
      }

      type Query {
        fooFromObj(obj: FooObj!): Foo!
      }
    `,
    resolvers: {
      Query: {
        fooFromObj: (_, { obj }) => obj,
      },
      Foo: {
        grault: obj => {
          if (!obj.id) {
            throw new Error(`id is required but got ${inspect(obj)}`);
          }
          return `F_GRAULT_FOR_${obj.id}`;
        },
      },
    },
  });

  const fusiongraphInText = /* GraphQL */ `
    type Foo
      @variable(name: "Foo_id", select: "id", subgraph: "A")
      @variable(name: "Foo_id", select: "id", subgraph: "B")
      @variable(name: "Foo_id", select: "id", subgraph: "C")
      @variable(name: "Foo_id_obj", value: "{ id: $Foo_id }", subgraph: "A")
      @variable(name: "Foo_id_obj", value: "{ id: $Foo_id }", subgraph: "B")
      @variable(name: "Foo_id_obj", value: "{ id: $Foo_id }", subgraph: "C")
      @resolver(operation: "query FooFromB($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "B")
      @resolver(operation: "query FooFromC($Foo_id: ID!) { foo(id: $Foo_id) }", subgraph: "C")
      @resolver(
        operation: "query FooFromD($Foo_id: [ID!]!) { foos(ids: $Foo_id) }"
        subgraph: "D"
        kind: BATCH
      )
      @resolver(
        operation: "query FooFromE($Foo_id: ID!, $Foo_baz: String) { fooWithComputedFromBaz(id: $Foo_id, baz: $Foo_baz) }"
        subgraph: "E"
      )
      @resolver(
        operation: "query FooFromF($Foo_id_obj: FooObj!) { fooFromObj(obj: $Foo_id_obj) }"
        subgraph: "F"
      ) {
      id: ID!
        @source(subgraph: "A")
        @source(subgraph: "B")
        @source(subgraph: "C")
        @source(subgraph: "E")
      bar: String! @source(subgraph: "B")
      baz: String! @source(subgraph: "C")
      child: Foo @source(subgraph: "C")
      children: [Foo!]! @source(subgraph: "C")
      qux: String! @source(subgraph: "D")
      quux: String! @source(subgraph: "B", name: "corge")
      computedFromBaz: String!
        @source(subgraph: "E", name: "computedFromBaz")
        @variable(name: "Foo_baz", select: "baz", subgraph: "C")
      grault: String! @source(subgraph: "F")
    }

    type Query {
      myFoo: Foo! @resolver(operation: "query MyFooFromA { myFoo }", subgraph: "A")
      foos: [Foo!]! @resolver(operation: "query FoosFromA { foos }", subgraph: "A")
      foo(id: ID!): Foo!
        @resolver(operation: "query FooFromB($id: ID!) { foo(id: $id) }", subgraph: "B")
      fooById(id: ID!): Foo!
        @resolver(operation: "query FooFromC($id: ID!) { foo(id: $id) }", subgraph: "C")
      fooWithComputedFromBaz(id: ID!, bar: String, baz: String): Foo!
        @resolver(
          operation: "query FooFromE($id: ID!, $baz: String) { fooWithComputedFromBaz(id: $id, baz: $baz) }"
          subgraph: "E"
        )
    }

    type Subscription {
      onFoo: Foo! @resolver(operation: "subscription OnFoo { onFoo }", subgraph: "A")
    }
  `;

  const fusiongraph = buildSchema(fusiongraphInText, {
    assumeValid: true,
    assumeValidSDL: true,
  });

  const executorMap = new Map();

  executorMap.set('A', createDefaultExecutor(aSchema));
  executorMap.set('B', createDefaultExecutor(bSchema));
  executorMap.set('C', createDefaultExecutor(cSchema));
  executorMap.set('D', createDefaultExecutor(dSchema));
  executorMap.set('E', createDefaultExecutor(eSchema));
  executorMap.set('F', createDefaultExecutor(fSchema));

  function onExecute(subgraphName: string, document: DocumentNode, variables: Record<string, any>) {
    const executor = executorMap.get(subgraphName);
    if (!executor) {
      throw new Error(`No executor found for subgraph ${subgraphName}`);
    }
    return executor({
      document,
      variables,
    });
  }

  it('works', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        myFoo {
          bar
          baz
          child {
            bar
            child {
              bar
            }
          }
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      myFoo: {
        bar: 'B_BAR_FOR_A_FOO_ID',
        baz: 'C_BAZ_FOR_A_FOO_ID',
        child: {
          bar: 'B_BAR_FOR_C_CHILD_ID_FOR_A_FOO_ID',
          child: {
            bar: 'B_BAR_FOR_C_CHILD_ID_FOR_C_CHILD_ID_FOR_A_FOO_ID',
          },
        },
      },
    });
  });
  it('works with lists', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        foos {
          bar
          baz
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      foos: [
        {
          bar: 'B_BAR_FOR_A_FOO_ID_0',
          baz: 'C_BAZ_FOR_A_FOO_ID_0',
        },
        {
          bar: 'B_BAR_FOR_A_FOO_ID_1',
          baz: 'C_BAZ_FOR_A_FOO_ID_1',
        },
      ],
    });
  });
  it('works with nested lists', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        foos {
          bar
          baz
          children {
            bar
            baz
            children {
              bar
              baz
            }
          }
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      foos: [
        {
          bar: 'B_BAR_FOR_A_FOO_ID_0',
          baz: 'C_BAZ_FOR_A_FOO_ID_0',
          children: [
            {
              bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
              baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
              children: [
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
                },
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_0',
                },
              ],
            },
            {
              bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
              baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
              children: [
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
                },
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_0',
                },
              ],
            },
          ],
        },
        {
          bar: 'B_BAR_FOR_A_FOO_ID_1',
          baz: 'C_BAZ_FOR_A_FOO_ID_1',
          children: [
            {
              bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
              baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
              children: [
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
                },
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_0_FOR_A_FOO_ID_1',
                },
              ],
            },
            {
              bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
              baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
              children: [
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_0_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
                },
                {
                  bar: 'B_BAR_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
                  baz: 'C_BAZ_FOR_C_CHILD_ID_1_FOR_C_CHILD_ID_1_FOR_A_FOO_ID_1',
                },
              ],
            },
          ],
        },
      ],
    });
  });
  it('works with lists & batching', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        foos {
          qux
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      foos: [
        {
          qux: 'D_QUX_FOR_A_FOO_ID_0',
        },
        {
          qux: 'D_QUX_FOR_A_FOO_ID_1',
        },
      ],
    });
  });
  it('works with aliases', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        myFoo {
          myBaz: baz
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      myFoo: {
        myBaz: 'C_BAZ_FOR_A_FOO_ID',
      },
    });
  });
  it('works with resolved aliases', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        myFoo {
          myBaz: baz
          myBar: bar
        }
      }
    `;

    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      myFoo: {
        myBaz: 'C_BAZ_FOR_A_FOO_ID',
        myBar: 'B_BAR_FOR_A_FOO_ID',
      },
    });
  });
  it('works with nested resolved alises', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        myFoo {
          myChild: child {
            myBar: bar
            myBaz: baz
          }
        }
      }
    `;

    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      myFoo: {
        myChild: {
          myBaz: 'C_BAZ_FOR_C_CHILD_ID_FOR_A_FOO_ID',
          myBar: 'B_BAR_FOR_C_CHILD_ID_FOR_A_FOO_ID',
        },
      },
    });
  });
  it('works with renamed fields', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        myFoo {
          quux
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      myFoo: {
        quux: 'B_CORGE_FOR_A_FOO_ID',
      },
    });
  });
  it('works with renamed aliased fields', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        myFoo {
          child {
            bar: quux
          }
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      myFoo: {
        child: {
          bar: 'B_CORGE_FOR_C_CHILD_ID_FOR_A_FOO_ID',
        },
      },
    });
  });
  it('works with fragments', async () => {
    const operationInText = /* GraphQL */ `
      fragment Foo on Foo {
        bar
        baz
      }
      query Test {
        myFoo {
          ...Foo
          child {
            ...Foo
            child {
              ...Foo
            }
          }
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      myFoo: {
        bar: 'B_BAR_FOR_A_FOO_ID',
        baz: 'C_BAZ_FOR_A_FOO_ID',
        child: {
          bar: 'B_BAR_FOR_C_CHILD_ID_FOR_A_FOO_ID',
          baz: 'C_BAZ_FOR_C_CHILD_ID_FOR_A_FOO_ID',
          child: {
            bar: 'B_BAR_FOR_C_CHILD_ID_FOR_C_CHILD_ID_FOR_A_FOO_ID',
            baz: 'C_BAZ_FOR_C_CHILD_ID_FOR_C_CHILD_ID_FOR_A_FOO_ID',
          },
        },
      },
    });
  });
  it('works with embedded arguments', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        foo(id: 1) {
          id
          baz
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      foo: {
        id: '1',
        baz: 'C_BAZ_FOR_1',
      },
    });
  });
  it('works with variables', async () => {
    const operationInText = /* GraphQL */ `
      query Test($id: ID!) {
        foo(id: $id) {
          id
          baz
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
      variables: {
        id: '1',
      },
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      foo: {
        id: '1',
        baz: 'C_BAZ_FOR_1',
      },
    });
  });
  it('works with variables with default values', async () => {
    const operationInText = /* GraphQL */ `
      query Test($id: ID = 1) {
        foo(id: $id) {
          id
          baz
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,

      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      foo: {
        id: '1',
        baz: 'C_BAZ_FOR_1',
      },
    });
  });
  it('works with renames', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        fooById(id: 1) {
          id
          baz
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    assertNonAsyncIterable(result);

    expect(result.data).toMatchObject({
      fooById: {
        id: '1',
        baz: 'C_BAZ_FOR_1',
      },
    });
  });
  it('plans a conditional variable', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        fooById(id: 1) {
          id
          computedFromBaz
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const plan = createExecutablePlanForOperation({
      fusiongraph,
      document: operationDoc,
    });

    expect(serializeExecutableOperationPlan(plan)).toEqual({
      resolverDependencyFieldMap: {
        fooById: [
          {
            subgraph: 'C',
            resolverOperationDocument:
              'query FooFromC {\n' +
              '  __export: foo(id: 1) {\n' +
              '    id\n' +
              '    __variable_1: id\n' +
              '    __variable_2: baz\n' +
              '  }\n' +
              '}',
            id: 0,
            resolverDependencies: [
              {
                subgraph: 'E',
                resolverOperationDocument:
                  'query FooFromE($__variable_1: ID!, $__variable_2: String) {\n' +
                  '  __export: fooWithComputedFromBaz(id: $__variable_1, baz: $__variable_2) {\n' +
                  '    computedFromBaz\n' +
                  '  }\n' +
                  '}',
                id: 1,
              },
            ],
          },
        ],
      },
      resolverOperationNodes: [],
    });

    const result = await executeOperationPlan({
      executablePlan: plan,
      onExecute,
      context: {},
    });

    assertNonAsyncIterable(result);

    expect(result).toEqual({
      data: {
        fooById: {
          computedFromBaz: 'E_COMPUTED_FROM_BAZ_FOR_1_AND_C_BAZ_FOR_1',
          id: '1',
        },
      },
      errors: undefined,
      extensions: undefined,
    });
  });
  it('plans subscriptions', async () => {
    const operationInText = /* GraphQL */ `
      subscription Test {
        onFoo {
          id
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const plan = createExecutablePlanForOperation({
      fusiongraph,
      document: operationDoc,
    });
    expect(serializeExecutableOperationPlan(plan)).toMatchObject({
      resolverOperationNodes: [],
      resolverDependencyFieldMap: {
        onFoo: [
          {
            subgraph: 'A',
            resolverOperationDocument: 'subscription OnFoo {\n  __export: onFoo {\n    id\n  }\n}',
            id: 0,
          },
        ],
      },
    });
  });
  it('executes subscription resolver node', async () => {
    const resolverOperationNode: ResolverOperationNode = {
      subgraph: 'A',
      resolverOperationDocument: parse(/* GraphQL */ `
        subscription OnFoo {
          __export: onFoo {
            id
          }
        }
      `),
      resolverDependencies: [],
      resolverPreDependencies: [],
      resolverDependencyFieldMap: new Map(),
    };
    const executableResolverOperationNode = createExecutableResolverOperationNode(
      resolverOperationNode,
      0,
    );
    const result = await executeResolverOperationNode({
      resolverOperationNode: executableResolverOperationNode,
      inputVariableMap: new Map(),
      onExecute,
      context: {},
      path: [],
      errors: [],
    });
    assertAsyncIterable(result);
    const collectedValues = [];
    for await (const iterRes of result) {
      collectedValues.push(iterRes);
    }
    expect(collectedValues).toMatchObject([
      {
        exported: { id: 'A_FOO_ID_0' },
      },
      {
        exported: { id: 'A_FOO_ID_1' },
      },
    ]);
  });
  it('executes subscription operation', async () => {
    const operationInText = /* GraphQL */ `
      subscription Test {
        onFoo {
          id
          bar
          baz
        }
      }
    `;
    const operationDoc = parseAndCache(operationInText);

    const result = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDoc,
      operationName: 'Test',
    });

    if (!isAsyncIterable(result)) {
      throw new Error(`Expected async iterable`);
    }

    const collectedValues = [];

    for await (const iterRes of result) {
      collectedValues.push(iterRes);
    }

    expect(collectedValues).toMatchObject([
      {
        data: {
          onFoo: {
            id: 'A_FOO_ID_0',
            bar: 'B_BAR_FOR_A_FOO_ID_0',
            baz: 'C_BAZ_FOR_A_FOO_ID_0',
          },
        },
      },
      {
        data: {
          onFoo: {
            id: 'A_FOO_ID_1',
            bar: 'B_BAR_FOR_A_FOO_ID_1',
            baz: 'C_BAZ_FOR_A_FOO_ID_1',
          },
        },
      },
    ]);
  });
  it('executes deferred operations', async () => {
    const operationInTextWithDefer = /* GraphQL */ `
      query Test {
        myFoo {
          bar
          baz
          ... on Foo @defer {
            child {
              bar
              child {
                bar
              }
            }
          }
        }
      }
    `;
    const operationInTextWithoutDefer = /* GraphQL */ `
      query Test {
        myFoo {
          bar
          baz
          ... on Foo {
            child {
              bar
              child {
                bar
              }
            }
          }
        }
      }
    `;
    const operationDocWithDefer = parseAndCache(operationInTextWithDefer);
    const operationDocWithoutDefer = parseAndCache(operationInTextWithoutDefer);
    const resultWithDefer = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDocWithDefer,
      operationName: 'Test',
    });
    const resultWithoutDefer = await executeOperation({
      fusiongraph,
      onExecute,
      document: operationDocWithoutDefer,
      operationName: 'Test',
    });
    assertAsyncIterable(resultWithDefer);
    assertNonAsyncIterable(resultWithoutDefer);
    const collectedValues = [];
    for await (const iterRes of resultWithDefer) {
      collectedValues.push(iterRes);
    }
    expect(collectedValues).toMatchSnapshot('defer');
    expect(collectedValues[collectedValues.length - 1]).toStrictEqual(resultWithoutDefer);

    const resultInDeferWay = await executeOperationWithPatches({
      fusiongraph,
      onExecute,
      document: operationDocWithDefer,
      operationName: 'Test',
    });

    const collectedPatches = [];
    for await (const iterRes of resultInDeferWay) {
      collectedPatches.push(iterRes);
    }

    expect(collectedPatches).toMatchSnapshot('defer patches');
  });
  it('plans computed variables', async () => {
    const operationInText = /* GraphQL */ `
      query Test {
        foo(id: 1) {
          id
          grault
        }
      }
    `;

    const operationDoc = parseAndCache(operationInText);

    const plan = createExecutablePlanForOperation({
      fusiongraph,
      document: operationDoc,
    });

    expect(serializeExecutableOperationPlan(plan)).toEqual({
      resolverOperationNodes: [],
      resolverDependencyFieldMap: {
        foo: [
          {
            subgraph: 'B',
            resolverOperationDocument:
              'query FooFromB {\n' +
              '  __export: foo(id: 1) {\n' +
              '    id\n' +
              '    __variable_1: id\n' +
              '  }\n' +
              '}',
            id: 0,
            resolverDependencies: [
              {
                subgraph: 'F',
                resolverOperationDocument:
                  'query FooFromF($__variable_1: ID!) {\n' +
                  '  __export: fooFromObj(obj: {id: $__variable_1}) {\n' +
                  '    grault\n' +
                  '  }\n' +
                  '}',
                id: 1,
              },
            ],
          },
        ],
      },
    });

    const result = await executeOperationPlan({
      executablePlan: plan,
      onExecute,
      context: {},
    });

    assertNonAsyncIterable(result);

    expect(result).toEqual({
      data: {
        foo: {
          grault: 'F_GRAULT_FOR_1',
          id: '1',
        },
      },
      errors: undefined,
      extensions: undefined,
    });
  });
});

describe('extractSubgraph', () => {
  it('works', () => {
    const fusiongraph = buildSchema(
      /* GraphQL */ `
        type Query {
          foo: Foo! @source(subgraph: "A")
        }

        type Foo @source(subgraph: "A") @source(subgraph: "B") @source(subgraph: "C") {
          id: ID! @source(subgraph: "A") @source(subgraph: "B") @source(subgraph: "C")
          name: String! @source(subgraph: "A", name: "fooName")
          bar: String! @source(subgraph: "B")
          baz: String! @source(subgraph: "C")
        }
      `,
      {
        assumeValid: true,
        assumeValidSDL: true,
      },
    );

    const aSubgraph = extractSubgraphFromFusiongraph('A', fusiongraph);

    expect(printSchemaWithDirectives(aSubgraph)).toBe(
      /* GraphQL */ `
schema {
  query: Query
}

type Query {
  foo: Foo! @source(subgraph: "A")
}

type Foo @source(subgraph: "A") {
  id: ID! @source(subgraph: "A")
  fooName: String! @source(subgraph: "A", name: "fooName")
}
    `.trim(),
    );
  });
});
