import { buildSchema, Kind, parse, print } from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import {
  composeSubgraphs,
  createFederationTransform,
  validateFederationLookupDirectives,
} from '../src/index';

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
    expect(printed).toMatch(/fooById\([^)]*\)[^\n]*@lookup/);
    expect(printed).not.toMatch(/fooById\([^)]*\)[^\n]*@merge/);
  });

  it('keeps @merge (not @lookup) for Mutation semantic-convention entry fields', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        ping: String
      }
      type Mutation {
        productById(id: ID!): Product
      }
      type Product {
        id: ID!
      }
    `);
    const { errors, annotatedSubgraphs } = composeSubgraphs([{ name: 'Products', schema }]);
    expect(errors ?? []).toEqual([]);
    const printed = print(annotatedSubgraphs.find(s => s.name === 'Products')!.typeDefs);
    expect(printed).toMatch(/productById\([^)]*\)[^\n]*@merge/);
    expect(printed).not.toMatch(/productById\([^)]*\)[^\n]*@lookup/);
  });

  it('keeps @merge for multi-arg Query semantic-convention entry fields', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        productById(id: ID!, locale: String = "en"): Product
      }
      type Product {
        id: ID!
      }
    `);
    const { errors, annotatedSubgraphs } = composeSubgraphs([{ name: 'Products', schema }]);
    expect(errors ?? []).toEqual([]);
    const printed = print(annotatedSubgraphs.find(s => s.name === 'Products')!.typeDefs);
    expect(printed).toMatch(/productById\([^)]*\)[^\n]*@merge/);
    expect(printed).not.toMatch(/productById\([^)]*\)[^\n]*@lookup/);
  });

  it('stamps @inaccessible alongside @internal so clients cannot select internal members', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @lookup on FIELD_DEFINITION
      directive @internal on OBJECT | FIELD_DEFINITION
      directive @key(fields: String!) repeatable on OBJECT | INTERFACE
      type Query {
        products: [Product!]!
        productBySku(sku: ID!): Product @lookup @internal
      }
      type Product @key(fields: "id") {
        id: ID!
        sku: ID!
      }
    `);
    const { errors, annotatedSubgraphs } = composeSubgraphs([{ name: 'Products', schema }]);
    expect(errors ?? []).toEqual([]);
    const printed = print(annotatedSubgraphs.find(s => s.name === 'Products')!.typeDefs);
    expect(printed).toMatch(/productBySku\([^)]*\)[^\n]*@internal/);
    expect(printed).toMatch(/productBySku\([^)]*\)[^\n]*@inaccessible/);
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

  it('rejects @internal on a nested @key selection field', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @key(fields: String!) repeatable on OBJECT | INTERFACE
      directive @internal on OBJECT | FIELD_DEFINITION
      type Query {
        product(id: ID!): Product
      }
      type Product @key(fields: "supplier { id }") {
        id: ID!
        supplier: Supplier
      }
      type Supplier {
        id: ID! @internal
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(
      errors.some(
        e =>
          e.message.includes('@internal') &&
          e.message.includes('Supplier.id') &&
          e.message.includes('@key'),
      ),
    ).toBe(true);
  });

  it('rejects zero-argument @lookup fields', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @lookup on FIELD_DEFINITION
      type Query {
        product: Product @lookup
      }
      type Product {
        id: ID!
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(errors.some(e => e.message.includes('at least one argument'))).toBe(true);
  });

  it('rejects incomplete nested @is field paths', () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar FieldSelectionMap
      directive @lookup on FIELD_DEFINITION
      directive @is(field: FieldSelectionMap!) on ARGUMENT_DEFINITION
      type Query {
        product(addressId: ID! @is(field: "address.id")): Product @lookup
      }
      type Product {
        id: ID!
        address: Address
      }
      type Address {
        street: String
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(errors.some(e => e.message.includes('does not match a field path'))).toBe(true);
  });

  it('rejects @is paths with empty segments', () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar FieldSelectionMap
      directive @lookup on FIELD_DEFINITION
      directive @is(field: FieldSelectionMap!) on ARGUMENT_DEFINITION
      type Query {
        product(addressId: ID! @is(field: "address..id")): Product @lookup
      }
      type Product {
        id: ID!
        address: Address
      }
      type Address {
        id: ID!
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(errors.some(e => e.message.includes('empty segments'))).toBe(true);
  });

  it('rejects @is paths that end on a non-leaf field', () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar FieldSelectionMap
      directive @lookup on FIELD_DEFINITION
      directive @is(field: FieldSelectionMap!) on ARGUMENT_DEFINITION
      type Query {
        product(addr: ID! @is(field: "address")): Product @lookup
      }
      type Product {
        id: ID!
        address: Address
      }
      type Address {
        id: ID!
      }
    `);
    const errors = validateFederationLookupDirectives(schema);
    expect(errors.some(e => e.message.includes('scalar or enum'))).toBe(true);
  });

  it('does not hide a public peer when another subgraph marks the field @internal', () => {
    const a = buildSchema(/* GraphQL */ `
      directive @internal on FIELD_DEFINITION
      type Query {
        status: String @internal
        aOnly: String
      }
    `);
    const b = buildSchema(/* GraphQL */ `
      type Query {
        status: String
        bOnly: String
      }
    `);
    const { errors, supergraphSdl } = composeSubgraphs([
      { name: 'A', schema: a },
      { name: 'B', schema: b },
    ]);
    expect(errors ?? []).toEqual([]);
    expect(supergraphSdl).toBeTruthy();
    const queryType = parse(supergraphSdl!).definitions.find(
      d => d.kind === Kind.OBJECT_TYPE_DEFINITION && d.name.value === 'Query',
    );
    expect(queryType?.kind).toBe(Kind.OBJECT_TYPE_DEFINITION);
    if (queryType?.kind !== Kind.OBJECT_TYPE_DEFINITION) {
      return;
    }
    const status = queryType.fields?.find(f => f.name.value === 'status');
    expect(status).toBeDefined();
    expect((status!.directives ?? []).some(d => d.name.value === 'inaccessible')).toBe(false);
  });

  it('keeps @merge when resolveReference keyArg is not a direct field argument', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        product(input: ProductInput!): Product
      }
      input ProductInput {
        id: ID!
      }
      type Product {
        id: ID!
      }
    `);
    const transform = createFederationTransform({
      Product: {
        key: {
          fields: 'id',
          resolveReference: {
            fieldName: 'product',
            keyArg: 'input.id',
            keyField: 'id',
          },
        },
      },
    });
    const result = transform(schema, { name: 'products', schema });
    const field = result.getQueryType()!.getFields().product!;
    const dirs = getDirectiveExtensions(field);
    expect(dirs.merge?.length).toBeGreaterThan(0);
    expect(dirs.lookup?.length || 0).toBe(0);
  });

  it('preserves inferred sku↔sku binding when @key fields is id (no @is remap)', () => {
    // productBySku(sku) with Product.sku: inferred argsExpr was `sku: $key.sku`.
    // Do not stamp `@is(field: "id")` just because @key.fields is id.
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        productBySku(sku: ID!): Product
      }
      type Product {
        id: ID!
        sku: ID!
      }
    `);
    const transform = createFederationTransform({
      Product: {
        key: {
          fields: 'id',
          resolveReference: {
            fieldName: 'productBySku',
          },
        },
      },
    });
    const result = transform(schema, { name: 'products', schema });
    const field = result.getQueryType()!.getFields().productBySku!;
    const dirs = getDirectiveExtensions(field);
    expect(dirs.lookup?.length).toBeGreaterThan(0);
    expect(dirs.merge?.length || 0).toBe(0);
    const skuArg = field.args.find(a => a.name === 'sku')!;
    const argDirs = getDirectiveExtensions(skuArg);
    expect(argDirs.is?.length || 0).toBe(0);
  });

  it('stamps @is(field: keyField) when the arg has no matching return field', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        product(productId: ID!): Product
      }
      type Product {
        id: ID!
      }
    `);
    const transform = createFederationTransform({
      Product: {
        key: {
          fields: 'id',
          resolveReference: {
            fieldName: 'product',
          },
        },
      },
    });
    const result = transform(schema, { name: 'products', schema });
    const field = result.getQueryType()!.getFields().product!;
    const dirs = getDirectiveExtensions(field);
    expect(dirs.lookup?.length).toBeGreaterThan(0);
    const productIdArg = field.args.find(a => a.name === 'productId')!;
    const argDirs = getDirectiveExtensions(productIdArg);
    expect(argDirs.is?.some((d: { field?: string }) => d?.field === 'id')).toBe(true);
  });

  it('keeps @merge for batch resolveReference when keyArg is omitted', () => {
    // Singular return so the list *argument* (not a list return) forces `@merge`.
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        products(ids: [ID!]!): Product
      }
      type Product {
        id: ID!
      }
    `);
    const transform = createFederationTransform({
      Product: {
        key: {
          fields: 'id',
          resolveReference: {
            fieldName: 'products',
          },
        },
      },
    });
    const result = transform(schema, { name: 'products', schema });
    const field = result.getQueryType()!.getFields().products!;
    const dirs = getDirectiveExtensions(field);
    expect(dirs.merge?.length).toBeGreaterThan(0);
    expect(dirs.lookup?.length || 0).toBe(0);
  });

  it('keeps @merge for non-Query resolveReference operations', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        ping: String
      }
      type Mutation {
        productById(id: ID!): Product
      }
      type Product {
        id: ID!
      }
    `);
    const transform = createFederationTransform({
      Product: {
        key: {
          fields: 'id',
          resolveReference: {
            fieldName: 'productById',
            operation: 'mutation',
          },
        },
      },
    });
    const result = transform(schema, { name: 'products', schema });
    const field = result.getMutationType()!.getFields().productById!;
    const dirs = getDirectiveExtensions(field);
    expect(dirs.merge?.length).toBeGreaterThan(0);
    expect(dirs.lookup?.length || 0).toBe(0);
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

  it('keeps @merge (not @lookup) for multi-arg entity entry fields', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        productBySkuAndPackage(sku: String!, package: String!): Product
      }
      type Product {
        sku: String!
        package: String!
      }
    `);
    const transform = createFederationTransform({
      Product: {
        key: {
          fields: 'sku package',
          resolveReference: {
            fieldName: 'productBySkuAndPackage',
          },
        },
      },
    });
    const result = transform(schema, { name: 'products', schema });
    const field = result.getQueryType()!.getFields().productBySkuAndPackage!;
    const dirs = getDirectiveExtensions(field);
    expect(dirs.merge?.length).toBeGreaterThan(0);
    expect(dirs.lookup?.length || 0).toBe(0);
  });

  it('keeps @merge (not @lookup) when resolveReference uses nested argsExpr', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        productBySkuAndVariationId(sku: String!, variationId: ID!): Product
      }
      type Product {
        sku: String!
        variation: ProductVariation
      }
      type ProductVariation {
        id: ID!
      }
    `);
    const transform = createFederationTransform({
      Product: {
        key: {
          fields: 'sku variation { id }',
          resolveReference: {
            fieldName: 'productBySkuAndVariationId',
            argsExpr: 'sku: $key.sku, variationId: $key.variation.id',
          },
        },
      },
    });
    const result = transform(schema, { name: 'products', schema });
    const field = result.getQueryType()!.getFields().productBySkuAndVariationId!;
    const dirs = getDirectiveExtensions(field);
    expect(dirs.merge?.length).toBeGreaterThan(0);
    expect(dirs.lookup?.length || 0).toBe(0);
  });

  it('stamps @merge for list/batch entity entry fields (not @lookup)', () => {
    const books = buildSchema(/* GraphQL */ `
      type Query {
        book(id: ID!): Book
        books(ids: [ID]): [Book!]!
      }
      type Book {
        id: ID!
        title: String!
      }
    `);
    const { errors, annotatedSubgraphs } = composeSubgraphs([{ name: 'Books', schema: books }]);
    expect(errors ?? []).toEqual([]);
    const printed = print(annotatedSubgraphs.find(s => s.name === 'Books')!.typeDefs);
    expect(printed).toMatch(/book\([^)]*\)[^\n]*@lookup/);
    expect(printed).toMatch(/books\([^)]*\)[^\n]*@merge/);
    expect(printed).not.toMatch(/books\([^)]*\)[^\n]*@lookup/);
  });

  it('still accepts hand-authored @merge on annotated subgraphs', () => {
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
