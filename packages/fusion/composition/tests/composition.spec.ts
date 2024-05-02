import { buildSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import {
  composeSubgraphs,
  createRenameFieldTransform,
  createRenameTypeTransform,
} from '../src/index.js';

describe('Composition', () => {
  const aSchema = buildSchema(/* GraphQL */ `
    type Query {
      myFoo: Foo!
    }

    type Foo {
      id: ID!
    }
  `);

  const bSchema = buildSchema(/* GraphQL */ `
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
  it('composes basic schemas', () => {
    const composedSchema = composeSubgraphs([
      {
        name: 'A',
        schema: aSchema,
      },
      {
        name: 'B',
        schema: bSchema,
      },
    ]);

    expect(printSchemaWithDirectives(composedSchema)).toMatchSnapshot();
  });
  it('composes with transforms', () => {
    const prefixTypeTransform = createRenameTypeTransform(
      (type, subgraphConfig) => `${subgraphConfig.name}_${type.name}`,
    );
    const prefixFieldTransform = createRenameFieldTransform(
      (_field, fieldName, typeName, subgraphConfig) =>
        typeName === `${subgraphConfig.name}_Query`
          ? `${subgraphConfig.name}_${fieldName}`
          : fieldName,
    );
    const composedSchema = composeSubgraphs([
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

    expect(printSchemaWithDirectives(composedSchema)).toMatchSnapshot();
  });
  it('keeps the directives', () => {
    const composedSchema = composeSubgraphs([
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

    expect(printSchemaWithDirectives(composedSchema)).toMatchSnapshot();
  });
});
