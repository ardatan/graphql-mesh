import { buildSchema, GraphQLEnumType, GraphQLSchema } from 'graphql';
import {
  composeSubgraphs,
  createPruneTransform,
  createRenameFieldTransform,
  createRenameTypeTransform,
} from '../src/index.js';

describe('Composition', () => {
  let aSchema: GraphQLSchema;
  let bSchema: GraphQLSchema;
  beforeEach(() => {
    aSchema = buildSchema(/* GraphQL */ `
      type Query {
        myFoo: Foo!
      }

      type Foo {
        id: ID!
      }
    `);

    bSchema = buildSchema(/* GraphQL */ `
      type Query {
        foo(id: ID!): Foo!
        foos(ids: [ID!]!): [Foo!]!
        foosByFilter(where: FooFilter!): [Foo!]!
      }

      input FooFilter {
        id: ID
        id_in: [ID!]
      }

      type Foo {
        id: ID!
        bar: String!
      }
    `);
  });
  it('composes basic schemas', () => {
    const { supergraphSdl } = composeSubgraphs([
      {
        name: 'A',
        schema: aSchema,
      },
      {
        name: 'B',
        schema: bSchema,
      },
    ]);

    expect(supergraphSdl).toMatchSnapshot();
  });
  it('composes with transforms', () => {
    const prefixTypeTransform = createRenameTypeTransform(
      ({ type, subgraphConfig }) => `${subgraphConfig.name}_${type.name}`,
    );
    const prefixFieldTransform = createRenameFieldTransform(
      ({ fieldName, typeName, subgraphConfig }) =>
        typeName === `${subgraphConfig.name}_Query`
          ? `${subgraphConfig.name}_${fieldName}`
          : fieldName,
    );
    const { supergraphSdl } = composeSubgraphs([
      {
        name: 'A',
        schema: aSchema,
        transforms: [prefixTypeTransform, prefixFieldTransform],
      },
      {
        name: 'B',
        schema: bSchema,
        transforms: [prefixTypeTransform, prefixFieldTransform],
      },
    ]);

    expect(supergraphSdl).toMatchSnapshot();
  });
  it('keeps the directives', () => {
    const { supergraphSdl } = composeSubgraphs([
      {
        name: 'A',
        schema: aSchema,
      },
      {
        name: 'B',
        schema: bSchema,
      },
      {
        name: 'C',
        schema: buildSchema(/* GraphQL */ `
          directive @foo on FIELD_DEFINITION
          type Query {
            cFoo: Foo! @foo
          }

          type Foo {
            id: ID!
          }
        `),
      },
    ]);

    expect(supergraphSdl).toMatchSnapshot();
  });
  describe('Pruning', () => {
    it('keeps enums that are only used in directive args', () => {
      const { supergraphSdl } = composeSubgraphs([
        {
          name: 'Test',
          schema: buildSchema(
            /* GraphQL */ `
              directive @test(arg: Test) on FIELD_DEFINITION
              type Query {
                foo: String @test(arg: TEST)
              }
              enum Test {
                TEST
              }
            `,
            { noLocation: true },
          ),
          transforms: [createPruneTransform()],
        },
      ]);
      const schema = buildSchema(supergraphSdl);
      const testEnum = schema.getType('Test');
      expect(testEnum).toBeInstanceOf(GraphQLEnumType);
    });
  });
  describe('Semantic Conventions', () => {
    const foo = buildSchema(/* GraphQL */ `
      type Query {
        foo(id: ID!, barId: ID): Foo!
      }
      type Foo {
        id: ID!
        barId: ID!
      }
    `);
    const bar = buildSchema(/* GraphQL */ `
      type Query {
        foo(id: ID!): Foo!
        bar(id: ID!): Bar!
      }
      type Foo {
        id: ID!
        bar: Bar!
      }
      type Bar {
        id: ID!
      }
    `);
    // Should ignore semantic conventions
    const baz = buildSchema(
      /* GraphQL */ `
        type Query {
          foo(id: ID!): Foo!
        }
        type Foo @key(fields: "id") {
          id: ID!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const { supergraphSdl, errors } = composeSubgraphs([
      {
        name: 'Foo',
        schema: foo,
      },
      {
        name: 'Bar',
        schema: bar,
      },
      {
        name: 'Baz',
        schema: baz,
      },
    ]);
    if (errors?.length) {
      if (errors.length > 1) {
        throw new AggregateError(errors, errors.map(e => e.message).join('\n'));
      }
      throw errors[0];
    }
    expect(supergraphSdl).toMatchInlineSnapshot(`
"
schema
  @link(url: "https://specs.apollo.dev/link/v1.0")
  @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
  
  
  
  
  
  @link(url: "https://the-guild.dev/graphql/mesh/spec/v1.0", import: ["@merge"]) 
{
  query: Query
  
  
}


  directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE

  directive @join__field(
    graph: join__Graph
    requires: join__FieldSet
    provides: join__FieldSet
    type: String
    external: Boolean
    override: String
    usedOverridden: Boolean
  ) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

  directive @join__graph(name: String!, url: String!) on ENUM_VALUE

  directive @join__implements(
    graph: join__Graph!
    interface: String!
  ) repeatable on OBJECT | INTERFACE

  directive @join__type(
    graph: join__Graph!
    key: join__FieldSet
    extension: Boolean! = false
    resolvable: Boolean! = true
    isInterfaceObject: Boolean! = false
  ) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

  directive @join__unionMember(graph: join__Graph!, member: String!) repeatable on UNION

  scalar join__FieldSet


  directive @link(
    url: String
    as: String
    for: link__Purpose
    import: [link__Import]
  ) repeatable on SCHEMA

  scalar link__Import

  enum link__Purpose {
    """
    \`SECURITY\` features provide metadata necessary to securely resolve fields.
    """
    SECURITY

    """
    \`EXECUTION\` features provide metadata necessary for operation execution.
    """
    EXECUTION
  }







enum join__Graph {
  BAR @join__graph(name: "Bar", url: "") 
  BAZ @join__graph(name: "Baz", url: "") 
  FOO @join__graph(name: "Foo", url: "") 
}

directive @merge(
  subgraph: String
  argsExpr: String
  keyArg: String
  keyField: String
  key: [String!]
  additionalArgs: String
) repeatable on FIELD_DEFINITION

type Query @join__type(graph: BAR)  @join__type(graph: BAZ)  @join__type(graph: FOO)  {
  foo(id: ID!) : Foo! @merge(subgraph: "Bar", keyField: "id", keyArg: "id")  @merge(subgraph: "Foo", keyField: "id", keyArg: "id") 
  bar(id: ID!) : Bar! @merge(subgraph: "Bar", keyField: "id", keyArg: "id")  @join__field(graph: BAR) 
}

type Foo @join__type(graph: BAR, key: "id")  @join__type(graph: BAZ, key: "id")  @join__type(graph: FOO, key: "id")  {
  id: ID!
  bar: Bar! @join__field(graph: BAR) 
  barId: ID! @join__field(graph: FOO) 
}

type Bar @join__type(graph: BAR, key: "id")  {
  id: ID!
}
    "
`);
  });
});
