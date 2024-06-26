import { GraphQLSchema, buildSchema } from 'graphql';
import {
  composeSubgraphs,
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
  })
  it('composes basic schemas', () => {
    const {
      supergraphSdl,
    } = composeSubgraphs([
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
    const {
      supergraphSdl,
    } = composeSubgraphs([
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
    const {
      supergraphSdl,
    } = composeSubgraphs([
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
});
