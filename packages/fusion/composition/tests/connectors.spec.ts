import { buildSchema, print } from 'graphql';
import {
  composeSubgraphs,
  entityKeyFieldsFromHttpPath,
  formatEntityStubSelection,
  getAnnotatedSubgraphs,
  inferEntityRefFromParentFkNames,
  isFederationConnectorsSubgraph,
  liftExtraSchemaDefinitionDirectives,
  parseEntityStubTypesFromSelection,
  toApolloRouterConnectorsSupergraph,
} from '../src/index.js';
import { createRenameTransform } from '../src/transforms/rename.js';

describe('Federation Connectors composition', () => {
  const connectorsSchema = buildSchema(/* GraphQL */ `
    schema
      @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
      @source(name: "rest", http: { baseURL: "https://api.example.com" }) {
      query: Query
    }

    directive @link(url: String!, import: [String]) repeatable on SCHEMA
    directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
    directive @connect(
      source: String
      http: ConnectHTTP
      selection: String!
      entity: Boolean
    ) repeatable on FIELD_DEFINITION | OBJECT

    input ConnectHTTP {
      GET: String
      headers: [HTTPHeaderMapping!]
      queryParams: String
      body: String
    }

    input SourceHTTP {
      baseURL: String!
      headers: [HTTPHeaderMapping!]
      queryParams: String
    }

    input HTTPHeaderMapping {
      name: String!
      value: String
      from: String
    }

    type Query {
      user(id: ID!): User
        @connect(source: "rest", http: { GET: "/users/{$args.id}" }, selection: "id name")
    }

    type User {
      id: ID!
      name: String
    }
  `);

  it('detects Federation Connectors subgraphs', () => {
    expect(isFederationConnectorsSubgraph(connectorsSchema)).toBe(true);
    expect(
      isFederationConnectorsSubgraph(
        buildSchema(/* GraphQL */ `
          type Query {
            hello: String
          }
        `),
      ),
    ).toBe(false);
  });

  it('does not add Mesh @transport or stitching @source for connectors subgraphs', () => {
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'REST',
        schema: connectorsSchema,
        transforms: [
          schema =>
            // noop transform — still must not inject stitching @source
            schema,
        ],
      },
    ]);

    expect(annotated).toHaveLength(1);
    expect(annotated[0].url).toBe('https://api.example.com');
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).not.toMatch(/@transport\b/);
    expect(sdl).not.toMatch(/@meshSource\b/);
    expect(sdl).not.toMatch(/@source\([^)]*subgraph:/);
    // Connectors-only: keep Apollo `@source` on the connect `@link` import.
    expect(sdl).toMatch(/import:\s*\[[^\]]*@source/);
    expect(sdl).toContain('specs.apollo.dev/connect/v0.4');
    expect(sdl).toContain('@connect');
  });

  it('keeps Apollo @source on schema extensions path', () => {
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'REST',
        schema: connectorsSchema,
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    // Apollo `@source` is carried via Mesh `@extraSchemaDefinitionDirective` on Query
    // until compose post-process lifts it onto `schema @source`.
    expect(sdl).toContain('extraSchemaDefinitionDirective');
    expect(sdl).toContain('https://api.example.com');
  });

  it('rewrites @connect $args when rename transform renames arguments', () => {
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'REST',
        schema: connectorsSchema,
        transforms: [
          createRenameTransform({
            argRenamer: ({ argName, fieldName }) =>
              fieldName === 'user' && argName === 'id' ? 'userId' : argName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).not.toMatch(/@source\([^)]*subgraph:/);
    expect(sdl).toContain('user(userId:');
    expect(sdl).toMatch(/\$args\.userId/);
    expect(sdl).not.toMatch(/\$args\.id\b/);
  });

  it('lifts transport/source from extras onto schema and drops the wrapper', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect"])
        @link(
          url: "https://the-guild.dev/graphql/mesh/spec/v1.0"
          import: ["@extraSchemaDefinitionDirective"]
        ) {
        query: Query
      }

      directive @link(
        url: String
        as: String
        for: link__Purpose
        import: [link__Import]
      ) repeatable on SCHEMA
      scalar link__Import
      enum link__Purpose {
        SECURITY
        EXECUTION
      }

      directive @extraSchemaDefinitionDirective(
        directives: _DirectiveExtensions
      ) repeatable on OBJECT
      scalar _DirectiveExtensions

      directive @connect(source: String, selection: String!) repeatable on FIELD_DEFINITION

      input SourceHTTP {
        baseURL: String!
      }

      type Query
        @extraSchemaDefinitionDirective(
          directives: {
            source: [{ name: "rest", http: { baseURL: "https://api.example.com" } }]
            transport: [{ subgraph: "REST", kind: "rest", location: "https://api.example.com" }]
          }
        ) {
        user: String @connect(source: "rest", selection: "id")
      }
    `;

    const lifted = liftExtraSchemaDefinitionDirectives(sdl);
    expect(lifted).not.toContain('extraSchemaDefinitionDirective');
    expect(lifted).not.toContain('_DirectiveExtensions');
    expect(lifted).toMatch(/schema[\s\S]*@source\(name: "rest"/);
    expect(lifted).toMatch(/schema[\s\S]*@transport\(subgraph: "REST"/);
    expect(lifted).toContain('directive @source');
    expect(lifted).toContain('directive @transport');
    expect(lifted).toMatch(/connect\/v0\.4", import: \["@connect", "@source"\]/);
    expect(lifted).toMatch(/mesh\/spec\/v1\.0".*import: \["@transport"\]/);
    expect(() => buildSchema(lifted, { assumeValidSDL: true })).not.toThrow();
  });

  it('composes connectors as Router-shaped @join__directive supergraph (no extras)', () => {
    const result = composeSubgraphs([{ name: 'REST', schema: connectorsSchema }]);
    expect(result.errors).toBeUndefined();
    const sdl = result.supergraphSdl!;
    expect(sdl).not.toContain('extraSchemaDefinitionDirective');
    // Canonical Mesh connectors SG is Apollo Router form — same SDL for Hive + Router.
    expect(sdl).toMatch(/@join__directive\([^)]*name: "source"/);
    expect(sdl).toMatch(/@join__directive\([^)]*name: "connect"/);
    expect(sdl).toContain('specs.apollo.dev/join/v0.5');
    expect(sdl).toMatch(
      /@link\(url: "https:\/\/specs\.apollo\.dev\/connect\/v0\.4", for: EXECUTION\)/,
    );
    expect(sdl).not.toMatch(/@connect\(/);
    expect(sdl).not.toMatch(/@source\(/);
    // Mesh `@transport` stays so Hive can select the REST transport; Router tolerates it.
    expect(sdl).toMatch(/@transport\(subgraph: "REST"/);
  });

  it('uses plain Mesh @source when composition has no Connectors', () => {
    const restSchema = buildSchema(/* GraphQL */ `
      type Query {
        user(id: ID!): User
      }
      type User {
        id: ID!
        name: String
      }
    `);
    (restSchema.extensions as any) = {
      directives: {
        transport: [
          {
            subgraph: 'REST',
            kind: 'rest',
            location: 'https://api.example.com',
          },
        ],
      },
    };

    const annotated = getAnnotatedSubgraphs([
      {
        name: 'REST',
        schema: restSchema,
        transforms: [
          createRenameTransform({
            fieldRenamer: ({ fieldName }) => (fieldName === 'user' ? 'person' : fieldName),
          }),
        ],
      },
    ]);
    const annotatedSdl = print(annotated[0].typeDefs);
    expect(annotatedSdl).not.toContain('@meshSource');
    expect(annotatedSdl).toMatch(/@source\([^)]*subgraph:/);
    expect(annotatedSdl).toMatch(/import:\s*\[[^\]]*@source/);

    const result = composeSubgraphs([
      {
        name: 'REST',
        schema: restSchema,
        transforms: [
          createRenameTransform({
            fieldRenamer: ({ fieldName }) => (fieldName === 'user' ? 'person' : fieldName),
          }),
        ],
      },
    ]);
    expect(result.errors).toBeUndefined();
    const sdl = result.supergraphSdl!;
    expect(sdl).not.toContain('@meshSource');
    expect(sdl).toMatch(/@source\([^)]*subgraph:/);
    expect(sdl).toMatch(/@transport\(subgraph: "REST"/);
    expect(sdl).not.toContain('extraSchemaDefinitionDirective');
  });

  it('aliases Mesh @source as @meshSource only in mixed Connectors compositions', () => {
    const meshSchema = buildSchema(/* GraphQL */ `
      type Query {
        user(id: ID!): User
      }
      type User {
        id: ID!
        name: String
      }
    `);

    const annotated = getAnnotatedSubgraphs([
      {
        name: 'MESH',
        schema: meshSchema,
        transforms: [
          createRenameTransform({
            fieldRenamer: ({ fieldName }) => (fieldName === 'user' ? 'person' : fieldName),
          }),
        ],
      },
      {
        name: 'REST',
        schema: connectorsSchema,
      },
    ]);
    const meshSdl = print(annotated[0].typeDefs);
    const restSdl = print(annotated[1].typeDefs);
    expect(meshSdl).toContain('@meshSource');
    expect(meshSdl).toMatch(/name:\s*"@source"/);
    expect(meshSdl).toMatch(/as:\s*"@meshSource"/);
    // Connect `@source` import stripped while Mesh stitching source is present.
    expect(restSdl).not.toMatch(/connect\/v0\.4", import: \[[^\]]*@source/);

    const result = composeSubgraphs([
      {
        name: 'MESH',
        schema: meshSchema,
        transforms: [
          createRenameTransform({
            fieldRenamer: ({ fieldName }) => (fieldName === 'user' ? 'person' : fieldName),
          }),
        ],
      },
      {
        name: 'REST',
        schema: connectorsSchema,
      },
    ]);
    expect(result.errors).toBeUndefined();
    const sdl = result.supergraphSdl!;
    expect(sdl).toContain('@meshSource');
    expect(sdl).toMatch(/@join__directive\([\s\S]*name: "source"[\s\S]*name: "rest"/);
    expect(sdl).toMatch(/@join__directive\([\s\S]*name: "connect"/);
    expect(sdl).not.toMatch(/@connect\(/);
  });

  it('toApolloRouterConnectorsSupergraph is idempotent on composed connectors SG', () => {
    const result = composeSubgraphs([{ name: 'Wiki', schema: connectorsSchema }]);
    expect(result.errors).toBeUndefined();
    const meshSdl = result.supergraphSdl!;
    expect(meshSdl).toMatch(/@join__directive\([^)]*name: "connect"/);
    const again = toApolloRouterConnectorsSupergraph(meshSdl);
    // Already finalized — early-return when no raw @connect remains
    expect(again).toBe(meshSdl);
  });

  it('emits type-level @connect with $this when keyArg !== keyField (Apollo entity pattern)', () => {
    // OpenAPI-style: getUserById(userId) → User.id — entity:true would be invalid.
    const schema = buildSchema(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "rest", http: { baseURL: "https://api.example.com" }) {
        query: Query
      }

      directive @link(url: String!, import: [String]) repeatable on SCHEMA
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION | OBJECT

      input ConnectHTTP {
        GET: String
      }
      input SourceHTTP {
        baseURL: String!
      }

      type Query {
        getUserById(userId: ID!): User
          @connect(source: "rest", http: { GET: "/users/{$args.userId}" }, selection: "id name")
      }

      type User {
        id: ID!
        name: String
      }
    `);

    const annotated = getAnnotatedSubgraphs([
      {
        name: 'rest',
        schema,
        transforms: [s => s],
      },
    ]);
    const annotatedSdl = print(annotated[0].typeDefs);
    // Query field keeps $args.userId (client entrypoint); no entity: true.
    expect(annotatedSdl).toMatch(/getUserById\(userId:[\s\S]*\$args\.userId/);
    expect(annotatedSdl).not.toMatch(/entity:\s*true/);
    // Type-level entity connector uses $this.id (Apollo patterns doc).
    expect(annotatedSdl).toMatch(/type User[\s\S]*@connect\([\s\S]*\$this\.id/);
    // Connectors entity → REST `_entities`; no Mesh `@merge`.
    expect(annotatedSdl).not.toMatch(/@merge\(/);

    const result = composeSubgraphs([
      {
        name: 'rest',
        schema,
        transforms: [s => s],
      },
    ]);
    expect(result.errors).toBeUndefined();
    const sdl = result.supergraphSdl!;
    // Supergraph: type-level connect rewritten to join__directive on User.
    expect(sdl).toMatch(
      /type User[\s\S]*@join__directive\([\s\S]*name:\s*"connect"[\s\S]*\$this\.id/,
    );
    expect(sdl).not.toMatch(/@connect\(/);
  });

  it('marks getCustomer(id:) with entity: true (get_<Type> + single key-typed arg)', () => {
    const schema = buildSchema(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "rest", http: { baseURL: "https://api.example.com" }) {
        query: Query
      }

      directive @link(url: String!, import: [String]) repeatable on SCHEMA
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION | OBJECT

      input ConnectHTTP {
        GET: String
      }
      input SourceHTTP {
        baseURL: String!
      }

      type Query {
        getCustomer(id: ID!): Customer
          @connect(source: "rest", http: { GET: "/customers/{$args.id}" }, selection: "id name")
      }

      type Customer {
        id: ID!
        name: String
      }
    `);

    const annotated = getAnnotatedSubgraphs([
      {
        name: 'rest',
        schema,
        transforms: [s => s],
      },
    ]);
    const annotatedSdl = print(annotated[0].typeDefs);
    expect(annotatedSdl).toMatch(/getCustomer\(id:[\s\S]*entity:\s*true/);
    expect(annotatedSdl).toMatch(/type Customer[\s\S]*@key\(fields: "id"\)/);
    expect(annotatedSdl).not.toMatch(/@merge\(/);
  });

  it('shared entity contract helpers match loader stub / path key rules', () => {
    expect(entityKeyFieldsFromHttpPath('/customers/{$args.id}', ['id', 'name'])).toEqual(['id']);
    expect(entityKeyFieldsFromHttpPath('/customers/{args.id}', ['id', 'name'])).toEqual(['id']);
    expect(entityKeyFieldsFromHttpPath('/pets/{$args.petId}', ['id', 'name'])).toBeUndefined();
    // Prefix: `$args.id` must not match `$args.identifier`.
    expect(entityKeyFieldsFromHttpPath('/items/{$args.identifier}', ['id', 'identifier'])).toEqual([
      'identifier',
    ]);
    expect(entityKeyFieldsFromHttpPath('/items/{$args.identifier}', ['id'])).toBeUndefined();
    expect(
      inferEntityRefFromParentFkNames(['id', 'customerId', 'customer'], 'customer', ['id']),
    ).toEqual({
      id: 'customerId',
    });
    expect(formatEntityStubSelection('customer', 'Customer', { id: 'customerId' })).toBe(
      'customer: { __typename: $("Customer") id: customerId }',
    );
    const stubs = parseEntityStubTypesFromSelection(
      'id name supplier: { __typename: $("Supplier") id: supplierId } price',
    );
    expect(Object.fromEntries(stubs)).toEqual({ Supplier: ['id'] });
  });

  it('marks stub-only entity types with @key(resolvable: false)', () => {
    const products = buildSchema(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "Products", http: { baseURL: "https://products.example.com" }) {
        query: Query
      }

      directive @link(url: String!, import: [String]) repeatable on SCHEMA
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION | OBJECT

      input ConnectHTTP {
        GET: String
      }
      input SourceHTTP {
        baseURL: String!
      }

      type Query {
        getProduct(id: ID!): Product
          @connect(
            source: "Products"
            http: { GET: "/products/{$args.id}" }
            selection: "id name supplier: { __typename: $(\\"Supplier\\") id: supplierId }"
          )
      }

      type Product {
        id: ID!
        name: String
        supplierId: ID
        supplier: Supplier
      }

      type Supplier {
        id: ID!
      }
    `);

    const suppliers = buildSchema(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "Suppliers", http: { baseURL: "https://suppliers.example.com" }) {
        query: Query
      }

      directive @link(url: String!, import: [String]) repeatable on SCHEMA
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION | OBJECT

      input ConnectHTTP {
        GET: String
      }
      input SourceHTTP {
        baseURL: String!
      }

      type Query {
        getSupplier(id: ID!): Supplier
          @connect(
            source: "Suppliers"
            http: { GET: "/suppliers/{$args.id}" }
            selection: "id name"
          )
      }

      type Supplier {
        id: ID!
        name: String
      }
    `);

    const result = composeSubgraphs([
      { name: 'Products', schema: products, transforms: [s => s] },
      { name: 'Suppliers', schema: suppliers, transforms: [s => s] },
    ]);
    expect(result.errors ?? []).toEqual([]);
    expect(result.supergraphSdl).toMatch(
      /type Supplier[\s\S]*@join__type\(graph: PRODUCTS,\s*key: "id",\s*resolvable: false\)/,
    );
    expect(result.supergraphSdl).toMatch(/@join__type\(graph: SUPPLIERS,\s*key: "id"\)/);
    expect(result.supergraphSdl).not.toMatch(/@resolveTo/);
  });
});
