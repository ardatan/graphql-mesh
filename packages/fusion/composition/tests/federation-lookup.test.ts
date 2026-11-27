import { buildSchema, print } from 'graphql';
import { composeSubgraphs, validateFederationLookupDirectives } from '../src/index';

describe('Federation Spec @lookup / @is / @internal', () => {
  it('emits @lookup for ById entity entry fields that return one object (not @merge)', () => {
    const foo = buildSchema(/* GraphQL */ `
      type Query {
        fooById(id: ID!): Foo!
      }
      type Foo {
        id: ID!
      }
    `);
    const bar = buildSchema(/* GraphQL */ `
      type Query {
        fooById(id: ID!): Foo!
        barById(id: ID!): Bar!
      }
      type Foo {
        id: ID!
        bar: Bar!
      }
      type Bar {
        id: ID!
      }
    `);
    const { supergraphSdl, errors, annotatedSubgraphs } = composeSubgraphs([
      { name: 'Foo', schema: foo },
      { name: 'Bar', schema: bar },
    ]);
    expect(errors ?? []).toEqual([]);
    expect(supergraphSdl).toBeTruthy();
    const fooAnnotated = annotatedSubgraphs.find(s => s.name === 'Foo')!;
    const printed = print(fooAnnotated.typeDefs);
    expect(printed).toContain('@lookup');
    expect(printed).not.toMatch(/fooById\([^)]*\)[^\n]*@merge/);
  });

  it('accepts @is when lookup arg name differs from entity field', () => {
    const withLookup = buildSchema(/* GraphQL */ `
      scalar FieldSelectionMap
      directive @lookup on FIELD_DEFINITION
      directive @is(field: FieldSelectionMap!) on ARGUMENT_DEFINITION
      directive @key(fields: String!) repeatable on OBJECT | INTERFACE
      type Query {
        product(productId: ID! @is(field: "id")): Product @lookup
      }
      type Product @key(fields: "id") {
        id: ID!
      }
    `);
    const errors = validateFederationLookupDirectives(withLookup);
    expect(errors).toEqual([]);
  });

  it('rejects @lookup that returns a list', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @lookup on FIELD_DEFINITION
      type Query {
        products(id: ID!): [Product!] @lookup
      }
      type Product {
        id: ID!
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(errors.some(e => e.message.includes('not a list'))).toBe(true);
  });

  it('rejects @lookup argument that does not match a return field without @is', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @lookup on FIELD_DEFINITION
      type Query {
        product(productId: ID!): Product @lookup
      }
      type Product {
        id: ID!
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(
      errors.some(e => e.message.includes('must match a field') || e.message.includes('@is')),
    ).toBe(true);
  });

  it('rejects @is on non-lookup field arguments', () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar FieldSelectionMap
      directive @is(field: FieldSelectionMap!) on ARGUMENT_DEFINITION
      type Query {
        product(productId: ID! @is(field: "id")): Product
      }
      type Product {
        id: ID!
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(errors.some(e => e.message.includes('only valid on arguments of @lookup'))).toBe(true);
  });

  it('rejects @is selection maps that supply arguments', () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar FieldSelectionMap
      directive @lookup on FIELD_DEFINITION
      directive @is(field: FieldSelectionMap!) on ARGUMENT_DEFINITION
      type Query {
        product(id: ID! @is(field: "id(scope: 1)")): Product @lookup
      }
      type Product {
        id: ID!
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(errors.some(e => e.message.includes('plain field path'))).toBe(true);
  });

  it('rejects @internal on a @key field', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @key(fields: String!) repeatable on OBJECT | INTERFACE
      directive @internal on OBJECT | FIELD_DEFINITION
      type Query {
        product(id: ID!): Product
      }
      type Product @key(fields: "id") {
        id: ID! @internal
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(errors.some(e => e.message.includes('@internal') && e.message.includes('@key'))).toBe(
      true,
    );
  });

  it('rejects @lookup behind an intermediate field that has arguments', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @lookup on FIELD_DEFINITION
      type Query {
        wrap(x: ID!): Wrap!
      }
      type Wrap {
        product(id: ID!): Product @lookup
      }
      type Product {
        id: ID!
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(
      errors.some(
        e =>
          e.message.includes('reachable from Query') ||
          e.message.includes('chain of fields with no arguments'),
      ),
    ).toBe(true);
  });

  it('still accepts legacy @merge on annotated subgraphs (back-compat)', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @merge(subgraph: String, keyField: String, keyArg: String) on FIELD_DEFINITION
      type Query {
        fooById(id: ID!): Foo! @merge(subgraph: "Foo", keyField: "id", keyArg: "id")
      }
      type Foo {
        id: ID!
      }
    `);
    const { errors } = composeSubgraphs([{ name: 'Foo', schema }]);
    expect(errors ?? []).toEqual([]);
  });
});
