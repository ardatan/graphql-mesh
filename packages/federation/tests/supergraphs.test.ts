import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { filterSchema, getDirective } from '@graphql-tools/utils';
import { buildSchema, lexicographicSortSchema, printSchema } from 'graphql';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';

describe('transitive directive type dependencies', () => {
  it('includes nested input types transitively when a used directive arg type references another input type', () => {
    // @myDirective has arg of type InputA, and InputA has a field of type InputB.
    // Without transitive collection, the subgraph SDL would reference InputB but
    // not define it, causing buildASTSchema to throw "Unknown type: InputB".
    const supergraphSdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.2", for: EXECUTION) {
        query: Query
      }

      directive @join__field(
        graph: join__Graph!
        requires: join__FieldSet
        provides: join__FieldSet
        type: String
        external: Boolean
        override: String
        usedOverridden: Boolean
      ) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

      directive @join__graph(name: String!, url: String!) on ENUM_VALUE

      directive @join__type(
        graph: join__Graph!
        key: join__FieldSet
        extension: Boolean! = false
        resolvable: Boolean! = true
      ) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR

      directive @link(
        url: String
        as: String
        for: link__Purpose
        import: [link__Import]
      ) repeatable on SCHEMA

      directive @myDirective(filter: InputA!) on FIELD_DEFINITION

      input InputA {
        nested: InputB
      }

      input InputB {
        value: String
      }

      scalar join__FieldSet

      enum join__Graph {
        PRODUCTS
          @join__graph(name: "products", url: "http://products:4000/graphql")
      }

      scalar link__Import

      enum link__Purpose {
        SECURITY
        EXECUTION
      }

      type Query @join__type(graph: PRODUCTS) {
        product: Product
      }

      type Product @join__type(graph: PRODUCTS) {
        id: ID! @myDirective(filter: { nested: { value: "x" } })
        name: String
      }
    `;

    // Should not throw "Unknown type: InputB" (or InputA)
    expect(() =>
      getStitchedSchemaFromSupergraphSdl({ supergraphSdl }),
    ).not.toThrow();
  });
});

describe('Supergraphs', () => {
  readdirSync(join(__dirname, 'fixtures', 'supergraphs')).forEach((fixture) => {
    describe(fixture, () => {
      const fixturePath = join(__dirname, 'fixtures', 'supergraphs', fixture);
      const supergraphSdl = readFileSync(fixturePath, 'utf8');
      it('matches', () => {
        const schema = getStitchedSchemaFromSupergraphSdl({ supergraphSdl });
        const sortedSchema = lexicographicSortSchema(schema);
        const sortedInputSchema = lexicographicSortSchema(
          buildSchema(supergraphSdl, {
            noLocation: true,
            assumeValid: true,
            assumeValidSDL: true,
          }),
        );
        const filteredInputSchema = filterSchema({
          schema: sortedInputSchema,
          typeFilter: (typeName) =>
            !typeName.startsWith('link__') &&
            !typeName.startsWith('join__') &&
            !typeName.startsWith('core__'),
          fieldFilter: (_, __, fieldConfig) =>
            !getDirective(sortedInputSchema, fieldConfig, 'inaccessible')
              ?.length,
          directiveFilter: (typeName) =>
            !typeName.startsWith('link__') &&
            !typeName.startsWith('join__') &&
            !typeName.startsWith('core__') &&
            typeName !== 'core' &&
            typeName !== 'link' &&
            typeName !== 'inaccessible',
          enumValueFilter: (_, __, enumValueConfig) =>
            !getDirective(sortedInputSchema, enumValueConfig, 'inaccessible')
              ?.length,
        });
        expect(printSchema(sortedSchema).trim()).toBe(
          printSchema(filteredInputSchema).trim(),
        );
      });
    });
  });
});
