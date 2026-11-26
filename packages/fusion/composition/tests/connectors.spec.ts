import { buildSchema, extendSchema, parse, print } from 'graphql';
import {
  composeSubgraphs,
  entityKeyFieldsFromHttpPath,
  finalizeConnectorsSupergraph,
  formatEntityStubSelection,
  getAnnotatedSubgraphs,
  importMeshDirectives,
  inferEntityRefFromParentFkNames,
  isFederationConnectorsSubgraph,
  isMongoSubgraph,
  isSqlSubgraph,
  liftExtraSchemaDefinitionDirectives,
  parseEntityStubTypesFromSelection,
  skipsMeshSourceAnnotations,
} from '../src/index.js';
import { createPrefixTransform } from '../src/transforms/prefix.js';
import { createRenameTransform } from '../src/transforms/rename.js';
import { compactGql } from './compactGql.js';

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

  it('detects SQL subgraphs and skips Mesh @source annotations', () => {
    const sqlSchema = buildSchema(/* GraphQL */ `
      schema @transport(subgraph: "Geo", kind: "sql", location: "postgres://localhost/db") {
        query: Query
      }
      directive @transport(subgraph: String!, kind: String!, location: String) repeatable on SCHEMA
      type Query {
        hello: String
      }
    `);
    expect(isSqlSubgraph(sqlSchema)).toBe(true);
    expect(skipsMeshSourceAnnotations(sqlSchema)).toBe(true);
    expect(
      isSqlSubgraph(
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
            // noop transform - still must not inject stitching @source
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
    expect(compactGql(sdl)).toMatch(/import:\s*\[[^\]]*@source/);
    expect(sdl).toContain('specs.apollo.dev/connect/v0.4');
    expect(sdl).toContain('@connect');
  });

  it('keeps options-only join transport when loader stamped @transport(options:)', () => {
    // Fresh schema - do not share `extensions.directives` with `connectorsSchema`.
    const withOpts = buildSchema(/* GraphQL */ `
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
    (withOpts.extensions as any) = {
      directives: {
        transport: [
          {
            subgraph: 'REST',
            kind: 'connect',
            location: 'https://api.example.com',
            options: { queryStringOptions: { arrayFormat: 'repeat' } },
          },
        ],
      },
    };
    const result = composeSubgraphs([{ name: 'REST', schema: withOpts }]);
    expect(result.errors).toBeUndefined();
    const sdl = result.supergraphSdl!;
    // Remaining connect options: native `@transport` (Apollo-safe; not join-carried).
    expect(sdl).toMatch(/@transport\(kind: "connect", subgraph: "REST"/);
    expect(sdl).toMatch(/queryStringOptions/);
    expect(sdl).toContain('arrayFormat');
    expect(sdl).toContain('repeat');
    expect(sdl).not.toMatch(/name: "transport"/);
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

  it('detects mongo subgraphs and skips Mesh @source on rename', () => {
    const mongoSchema = buildSchema(
      /* GraphQL */ `
        directive @transport(
          subgraph: String!
          kind: String!
          location: String
          headers: [[String]]
        ) repeatable on SCHEMA

        directive @mongo__findOne(
          subgraph: String
          collection: String
          query: String
          selection: String
        ) on FIELD_DEFINITION

        schema @transport(subgraph: "users", kind: "mongo", location: "mongodb://localhost/test") {
          query: Query
        }

        type Query {
          findUserById(id: ID!): User
            @mongo__findOne(
              collection: "users"
              query: "_id: $args.id"
              selection: "id: _id\\nname: name"
            )
        }

        type User {
          id: ID!
          name: String
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );

    expect(isMongoSubgraph(mongoSchema)).toBe(true);
    expect(skipsMeshSourceAnnotations(mongoSchema)).toBe(true);

    const annotated = getAnnotatedSubgraphs([
      {
        name: 'users',
        schema: mongoSchema,
        transforms: [
          createRenameTransform({
            argRenamer: ({ argName, fieldName }) =>
              fieldName === 'findUserById' && argName === 'id' ? 'userId' : argName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).not.toMatch(/@source\([^)]*subgraph:/);
    expect(sdl).not.toMatch(/@meshSource\b/);
    expect(sdl).toContain('findUserById(userId:');
    expect(sdl).toMatch(/\$args\.userId/);
    expect(sdl).not.toMatch(/\$args\.id\b/);
  });

  it('rewrites @thrift__rpc $args when rename transform renames arguments', () => {
    const thriftSchema = buildSchema(/* GraphQL */ `
      schema @transport(subgraph: "Calc", kind: "thrift", location: "http://localhost/thrift") {
        query: Query
      }

      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        headers: [[String]]
      ) repeatable on SCHEMA

      directive @thrift__rpc(
        subgraph: String
        function: String!
        args: String!
        selection: String!
        messageType: String
      ) on FIELD_DEFINITION

      input AddRequestInput {
        left: Int!
        right: Int!
      }

      type Query {
        add(request: AddRequestInput): Int
          @thrift__rpc(
            function: "add"
            args: """
            1(struct): $args.request {
              1(i32): left
              2(i32): right
            }
            """
            selection: "$(i32)"
            messageType: "CALL"
          )
      }
    `);
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'Calc',
        schema: thriftSchema,
        transforms: [
          createRenameTransform({
            argRenamer: ({ argName, fieldName }) =>
              fieldName === 'add' && argName === 'request' ? 'input' : argName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toContain('add(input:');
    expect(sdl).toMatch(/\$args\.input/);
    expect(sdl).not.toMatch(/\$args\.request\b/);
  });

  it('Neo4j rename uses @node(labels:)/@plural/@alias without Mesh @source', () => {
    const neo4jSchema = buildSchema(/* GraphQL */ `
      schema
        @transport(
          subgraph: "Movies"
          kind: "neo4j"
          location: "neo4j://localhost"
          options: { database: "neo4j" }
        ) {
        query: Query
      }

      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        headers: [[String]]
        options: TransportOptions
      ) repeatable on SCHEMA
      scalar TransportOptions

      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @alias(subgraph: String, property: String!) on FIELD_DEFINITION
      directive @relationship(
        subgraph: String
        type: String
        direction: _RelationDirections
        properties: String
      ) on FIELD_DEFINITION
      enum _RelationDirections {
        IN
        OUT
      }
      directive @cypher(
        subgraph: String
        statement: String!
        columnName: String!
      ) on FIELD_DEFINITION

      type Movie @node(subgraph: "Movies") {
        title: String
        actors: [Person!]! @relationship(subgraph: "Movies", type: "ACTED_IN", direction: IN)
        similar(title: String!): [Movie!]!
          @cypher(
            subgraph: "Movies"
            statement: """
            MATCH (this:Movie)
            WHERE this.title CONTAINS $title
            RETURN this AS m
            """
            columnName: "m"
          )
      }

      type Person @node(subgraph: "Movies") {
        name: String
      }

      type Query {
        movies: [Movie!]!
      }
    `);
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'Movies',
        schema: neo4jSchema,
        transforms: [
          createRenameTransform({
            typeRenamer: ({ typeName }) => (typeName === 'Movie' ? 'Film' : typeName),
            fieldRenamer: ({ typeName, fieldName }) =>
              (typeName === 'Movie' || typeName === 'Film') && fieldName === 'title'
                ? 'movieTitle'
                : fieldName,
            argRenamer: ({ typeName, fieldName, argName }) =>
              (typeName === 'Movie' || typeName === 'Film') &&
              fieldName === 'similar' &&
              argName === 'title'
                ? 'needle'
                : argName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).not.toMatch(/@source\(/);
    expect(sdl).not.toMatch(/@meshSource\(/);
    expect(sdl).not.toMatch(/@introspection\b/);
    expect(sdl).toMatch(/type Film[\s\S]*@node\([^)]*subgraph:\s*"Movies"/);
    expect(sdl).toMatch(/type Film[\s\S]*@node\([^)]*labels:\s*\["Movie"\]/);
    expect(sdl).toMatch(/type Film[\s\S]*@plural\([^)]*value:\s*"movies"/);
    expect(sdl).toMatch(/movieTitle:\s*String\s*@alias\([^)]*property:\s*"title"/);
    expect(sdl).toContain('actors:');
    expect(sdl).not.toMatch(/actors:[\s\S]*@alias/);
    expect(sdl).toContain('similar(needle:');
    expect(sdl).toMatch(/\$needle\b/);
    expect(sdl).not.toMatch(/\$title\b/);
    expect(sdl).toMatch(/movies:\s*\[Film!\]!/);
  });

  it('Neo4j type rename rewrites @relationship(properties:)', () => {
    const neo4jSchema = buildSchema(/* GraphQL */ `
      schema
        @transport(
          subgraph: "Movies"
          kind: "neo4j"
          location: "neo4j://localhost"
          options: { database: "neo4j" }
        ) {
        query: Query
      }

      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        headers: [[String]]
        options: TransportOptions
      ) repeatable on SCHEMA
      scalar TransportOptions

      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @relationshipProperties(subgraph: String) on OBJECT
      directive @relationship(
        subgraph: String
        type: String
        direction: _RelationDirections
        properties: String
      ) on FIELD_DEFINITION
      enum _RelationDirections {
        IN
        OUT
      }

      type ActedIn @relationshipProperties(subgraph: "Movies") {
        role: String
      }

      type Movie @node(subgraph: "Movies") {
        title: String
        actors: [Person!]!
          @relationship(subgraph: "Movies", type: "ACTED_IN", direction: IN, properties: "ActedIn")
      }

      type Person @node(subgraph: "Movies") {
        name: String
      }

      type Query {
        movies: [Movie!]!
      }
    `);
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'Movies',
        schema: neo4jSchema,
        transforms: [
          createRenameTransform({
            typeRenamer: ({ typeName }) => (typeName === 'ActedIn' ? 'Credit' : typeName),
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/type Credit[\s\S]*@relationshipProperties/);
    expect(sdl).toMatch(/@relationship\([^)]*properties:\s*"Credit"/);
    expect(sdl).toMatch(/@relationship\([^)]*type:\s*"ACTED_IN"/);
    expect(sdl).not.toMatch(/properties:\s*"ActedIn"/);
  });

  it('HTTP @node without Neo4j transport does not stamp Neo4j identity directives', () => {
    const httpSchema = buildSchema(/* GraphQL */ `
      schema @transport(subgraph: "Articles", kind: "rest", location: "http://localhost/articles") {
        query: Query
      }

      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        headers: [[String]]
        options: TransportOptions
      ) repeatable on SCHEMA
      scalar TransportOptions

      directive @node(idField: String) on OBJECT

      type Article @node(idField: "id") {
        title: String
      }

      type Query {
        articles: [Article!]!
      }
    `);
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'Articles',
        schema: httpSchema,
        transforms: [
          createRenameTransform({
            typeRenamer: ({ typeName }) => (typeName === 'Article' ? 'Story' : typeName),
            fieldRenamer: ({ typeName, fieldName }) =>
              (typeName === 'Article' || typeName === 'Story') && fieldName === 'title'
                ? 'headline'
                : fieldName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/type Story[\s\S]*@node\(idField:\s*"id"\)/);
    expect(sdl).not.toMatch(/@plural\b/);
    expect(sdl).not.toMatch(/labels:\s*\[/);
    expect(sdl).toContain('headline:');
    expect(sdl).not.toMatch(/@alias\b/);
  });

  it('Neo4j type rename strips consumed @node from extensionASTNodes', () => {
    const base = buildSchema(/* GraphQL */ `
      schema
        @transport(
          subgraph: "Movies"
          kind: "neo4j"
          location: "neo4j://localhost"
          options: { database: "neo4j" }
        ) {
        query: Query
      }

      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        headers: [[String]]
        options: TransportOptions
      ) repeatable on SCHEMA
      scalar TransportOptions

      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @plural(subgraph: String, value: String!) on OBJECT

      type Movie {
        title: String
      }

      type Query {
        movies: [Movie!]!
      }
    `);
    const neo4jSchema = extendSchema(
      base,
      parse(/* GraphQL */ `
        extend type Movie @node(subgraph: "Movies") {
          year: Int
        }
      `),
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'Movies',
        schema: neo4jSchema,
        transforms: [
          createRenameTransform({
            typeRenamer: ({ typeName }) => (typeName === 'Movie' ? 'Film' : typeName),
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    const filmDefs = annotated[0].typeDefs.definitions.filter(
      def =>
        (def.kind === 'ObjectTypeDefinition' || def.kind === 'ObjectTypeExtension') &&
        def.name.value === 'Film',
    );
    const nodeApps = filmDefs.flatMap(
      def => ('directives' in def && def.directives?.filter(d => d.name.value === 'node')) || [],
    );
    expect(nodeApps).toHaveLength(1);
    expect(sdl).toMatch(/type Film[\s\S]*@node\([^)]*labels:\s*\["Movie"\]/);
    expect(sdl).toMatch(/type Film[\s\S]*@plural\([^)]*value:\s*"movies"/);
    expect(sdl).not.toMatch(/extend type Film[\s\S]*@node\b/);
  });

  it('Neo4j consecutive type renames keep a single @relationship(properties:)', () => {
    const neo4jSchema = buildSchema(/* GraphQL */ `
      schema
        @transport(
          subgraph: "Movies"
          kind: "neo4j"
          location: "neo4j://localhost"
          options: { database: "neo4j" }
        ) {
        query: Query
      }

      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        headers: [[String]]
        options: TransportOptions
      ) repeatable on SCHEMA
      scalar TransportOptions

      directive @node(subgraph: String, labels: [String!]) on OBJECT
      directive @relationshipProperties(subgraph: String) on OBJECT
      directive @relationship(
        subgraph: String
        type: String
        direction: _RelationDirections
        properties: String
      ) on FIELD_DEFINITION
      enum _RelationDirections {
        IN
        OUT
      }

      type ActedIn @relationshipProperties(subgraph: "Movies") {
        role: String
      }

      type Movie @node(subgraph: "Movies") {
        title: String
        actors: [Person!]!
          @relationship(subgraph: "Movies", type: "ACTED_IN", direction: IN, properties: "ActedIn")
      }

      type Person @node(subgraph: "Movies") {
        name: String
      }

      type Query {
        movies: [Movie!]!
      }
    `);
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'Movies',
        schema: neo4jSchema,
        transforms: [
          createRenameTransform({
            typeRenamer: ({ typeName }) => (typeName === 'ActedIn' ? 'Credit' : typeName),
          }),
          createRenameTransform({
            typeRenamer: ({ typeName }) => (typeName === 'Credit' ? 'Role' : typeName),
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/type Role[\s\S]*@relationshipProperties/);
    expect(sdl).not.toMatch(/properties:\s*"ActedIn"/);
    expect(sdl).not.toMatch(/properties:\s*"Credit"/);
    const movie = annotated[0].typeDefs.definitions.find(
      def => def.kind === 'ObjectTypeDefinition' && def.name.value === 'Movie',
    );
    expect(movie && movie.kind === 'ObjectTypeDefinition').toBe(true);
    if (movie && movie.kind === 'ObjectTypeDefinition') {
      const actors = movie.fields?.find(field => field.name.value === 'actors');
      const relationshipDirs =
        actors?.directives?.filter(directive => directive.name.value === 'relationship') ?? [];
      expect(relationshipDirs).toHaveLength(1);
      const properties = relationshipDirs[0].arguments?.find(
        arg => arg.name.value === 'properties',
      );
      expect(properties?.value).toMatchObject({ kind: 'StringValue', value: 'Role' });
    }
  });

  it('lifts transport/source from extras onto schema and drops the wrapper', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect"])
        @link(
          url: "https://specs.graphql-mesh.dev/core/v0.1"
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
            transport: [{ subgraph: "REST", kind: "connect", location: "https://api.example.com" }]
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
    expect(compactGql(lifted)).toMatch(/connect\/v0\.4",import:\["@connect","@source"\]/);
    expect(compactGql(lifted)).toMatch(
      /specs\.graphql-mesh\.dev\/.*\/v0\.1".*import:\["@transport"\]/,
    );
    expect(() => buildSchema(lifted, { assumeValidSDL: true })).not.toThrow();
  });

  it('composes connectors as Router-shaped @join__directive supergraph (no extras)', () => {
    const result = composeSubgraphs([{ name: 'REST', schema: connectorsSchema }]);
    expect(result.errors).toBeUndefined();
    const sdl = result.supergraphSdl!;
    expect(sdl).not.toContain('extraSchemaDefinitionDirective');
    // Canonical Mesh connectors SG - same SDL for Hive Gateway + Apollo Router.
    expect(sdl).toMatch(/@join__directive\([^)]*name: "source"/);
    expect(sdl).toMatch(/@join__directive\([^)]*name: "connect"/);
    expect(sdl).toContain('specs.apollo.dev/join/v0.5');
    expect(sdl).toMatch(
      /@link\(url: "https:\/\/specs\.apollo\.dev\/connect\/v0\.4", for: EXECUTION\)/,
    );
    expect(sdl).not.toMatch(/@connect\(/);
    expect(sdl).not.toMatch(/@source\(/);
    // Optimized Mesh: no `@transport` / join transport when Connectors are present -
    // Gateway infers `kind: "connect"` from join connect/source.
    expect(sdl).not.toMatch(/@transport\s*\(/);
    expect(sdl).not.toMatch(/name: "transport"/);
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
            kind: 'connect',
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
    expect(compactGql(annotatedSdl)).toMatch(/import:\s*\[[^\]]*@source/);

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
    // Field-level Mesh `@source` → `@join__directive` on the final SG (arg-level
    // Mesh `@source` may remain native - federation extract skips those locs).
    expect(sdl).toMatch(/@join__directive\([\s\S]*name: "source"/);
    expect(sdl).not.toMatch(/@source\([^)]*subgraph:/);
    // Non-connectors Mesh subgraph with connect-shaped transport still rewrites;
    // plain http/connect without extras is dropped when join owns location.
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
    // Annotated subgraphs keep `@meshSource`; final SG uses join__directive.
    expect(sdl).toMatch(/@join__directive\([\s\S]*name: "meshSource"/);
    expect(sdl).not.toMatch(/@meshSource\s*\(/);
    // Join-carried meshSource still keeps the aliased Mesh `@link` import.
    expect(compactGql(sdl)).toMatch(
      /specs\.graphql-mesh\.dev\/core\/v0\.1",import:\[[^\]]*\{name:"@source",as:"@meshSource"\}/,
    );
    expect(sdl).toMatch(/@join__directive\([\s\S]*name: "source"[\s\S]*name: "rest"/);
    expect(sdl).toMatch(/@join__directive\([\s\S]*name: "connect"/);
    expect(sdl).not.toMatch(/@connect\(/);
  });

  it('finalizeConnectorsSupergraph is idempotent on composed connectors SG', () => {
    const result = composeSubgraphs([{ name: 'Wiki', schema: connectorsSchema }]);
    expect(result.errors).toBeUndefined();
    const meshSdl = result.supergraphSdl!;
    expect(meshSdl).toMatch(/@join__directive\([^)]*name: "connect"/);
    const again = finalizeConnectorsSupergraph(meshSdl);
    // Already finalized - early-return when no raw @connect remains
    expect(again).toBe(meshSdl);
  });

  it('strips linked connect scalars so they do not leak as join__type', () => {
    const withLinkedScalars = buildSchema(/* GraphQL */ `
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
        selection: JSONSelection!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION

      scalar JSONSelection
      scalar URLPathTemplate

      input ConnectHTTP {
        GET: URLPathTemplate
        body: JSONSelection
      }
      input SourceHTTP {
        baseURL: String!
      }

      type Query {
        user(id: ID!): User
          @connect(source: "rest", http: { GET: "/users/{$args.id}" }, selection: "id")
      }
      type User {
        id: ID!
      }
    `);
    const result = composeSubgraphs([{ name: 'REST', schema: withLinkedScalars }]);
    expect(result.errors).toBeUndefined();
    const sdl = result.supergraphSdl!;
    expect(sdl).not.toMatch(/\bscalar JSONSelection\b/);
    expect(sdl).not.toMatch(/\bscalar URLPathTemplate\b/);
    expect(sdl).toMatch(/@join__directive\([\s\S]*name: "connect"/);
  });

  it('does not prefix connect link scalars (ignoreList, like String/ID)', () => {
    const withLinkedScalars = buildSchema(/* GraphQL */ `
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
        selection: JSONSelection!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION

      scalar JSONSelection
      scalar URLPathTemplate

      input ConnectHTTP {
        GET: URLPathTemplate
        body: JSONSelection
      }
      input SourceHTTP {
        baseURL: String!
      }

      type Query {
        user(id: ID!): User
          @connect(source: "rest", http: { GET: "/users/{$args.id}" }, selection: "id")
      }
      type User {
        id: ID!
      }
    `);
    const result = composeSubgraphs([
      {
        name: 'REST',
        schema: withLinkedScalars,
        transforms: [createPrefixTransform({ value: 'REST_' })],
      },
    ]);
    expect(result.errors).toBeUndefined();
    const sdl = result.supergraphSdl!;
    // Prefixed app types, but connect scalars stay exact then get stripped by finalize.
    expect(sdl).toMatch(/\bREST_User\b/);
    expect(sdl).not.toMatch(/\bscalar REST_JSONSelection\b/);
    expect(sdl).not.toMatch(/\bscalar REST_URLPathTemplate\b/);
    expect(sdl).not.toMatch(/\bscalar JSONSelection\b/);
    expect(sdl).not.toMatch(/\bscalar URLPathTemplate\b/);
  });

  it('preserves application scalars that share the JSONSelection suffix', () => {
    const withAppScalar = buildSchema(/* GraphQL */ `
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
        selection: JSONSelection!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION

      scalar JSONSelection
      scalar AuditJSONSelection

      input ConnectHTTP {
        GET: String
      }
      input SourceHTTP {
        baseURL: String!
      }

      type Query {
        user(id: ID!): User
          @connect(source: "rest", http: { GET: "/users/{$args.id}" }, selection: "id")
        audit: AuditJSONSelection
      }
      type User {
        id: ID!
      }
    `);
    const result = composeSubgraphs([{ name: 'REST', schema: withAppScalar }]);
    expect(result.errors).toBeUndefined();
    const sdl = result.supergraphSdl!;
    expect(sdl).not.toMatch(/\bscalar JSONSelection\b/);
    expect(sdl).toMatch(/\bscalar AuditJSONSelection\b/);
  });

  it('emits type-level @connect with $this when keyArg !== keyField (Apollo entity pattern)', () => {
    // OpenAPI-style: getUserById(userId) → User.id - entity:true would be invalid.
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

  it('attributes type-level @connect to the source owner when extension join__type is listed first', () => {
    // Mimic compose output before finalize: stub subgraph extension key first,
    // then OData/Connectors owner with type-level entity @connect(source: "Trippin").
    const before = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "Trippin", http: { baseURL: "http://127.0.0.1:4001" }) {
        query: Query
      }

      directive @join__graph(name: String!, url: String!) on ENUM_VALUE
      directive @join__type(
        graph: join__Graph!
        key: join__FieldSet
        extension: Boolean! = false
        resolvable: Boolean! = true
      ) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR
      directive @join__field(graph: join__Graph) repeatable on FIELD_DEFINITION
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION | OBJECT
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
      directive @link(url: String!, import: [String], for: link__Purpose) repeatable on SCHEMA

      enum link__Purpose {
        SECURITY
        EXECUTION
      }
      scalar join__FieldSet
      enum join__Graph {
        CATALOG @join__graph(name: "catalog", url: "http://localhost:4002/graphql")
        TRIPPIN @join__graph(name: "Trippin", url: "http://127.0.0.1:4001")
      }
      input ConnectHTTP {
        GET: String
      }
      input SourceHTTP {
        baseURL: String!
      }

      type Query @join__type(graph: CATALOG) @join__type(graph: TRIPPIN) {
        featuredAirline: Airline @join__field(graph: CATALOG)
        AirlinesByAirlineCode(AirlineCode: String!): Airline
          @join__field(graph: TRIPPIN)
          @connect(
            source: "Trippin"
            http: { GET: "/Airlines/{$args.AirlineCode}/" }
            selection: "AirlineCode Name"
            entity: true
          )
      }

      type Airline
        @join__type(graph: CATALOG, key: "AirlineCode", extension: true, resolvable: false)
        @join__type(graph: TRIPPIN, key: "AirlineCode")
        @connect(
          source: "Trippin"
          http: { GET: "/Airlines/{$this.AirlineCode}/" }
          selection: "AirlineCode Name"
          entity: true
        ) {
        AirlineCode: String!
        isFeatured: Boolean @join__field(graph: CATALOG)
        Name: String @join__field(graph: TRIPPIN)
      }
    `;

    const out = finalizeConnectorsSupergraph(before);
    // Scope to the Airline type - Query.AirlinesByAirlineCode also has connect.
    expect(compactGql(out)).toMatch(
      /type Airline[\s\S]*@join__directive\(graphs:\[TRIPPIN\],name:"connect",args:\{source:"Trippin"[\s\S]*entity:true\}/,
    );
    expect(out).not.toMatch(
      /type Airline[\s\S]*@join__directive\(graphs: \[CATALOG\], name: "connect"/,
    );
  });

  it('attributes field-level @connect by @join__field when source names collide', () => {
    // Two subgraphs both use connector source name "api"; field ownership must
    // follow `@join__field(graph:)`, not the first graph that claimed "api".
    // Schema @source must be emitted for every graph that referenced "api", and a
    // sole-join type-level @connect on Product must stay on PRODUCTS.
    const before = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "api", http: { baseURL: "https://api.example.com" }) {
        query: Query
      }

      directive @join__graph(name: String!, url: String!) on ENUM_VALUE
      directive @join__type(graph: join__Graph!, key: join__FieldSet) repeatable on OBJECT
      directive @join__field(graph: join__Graph) on FIELD_DEFINITION
      directive @join__directive(
        graphs: [join__Graph!]
        name: String!
        args: join__DirectiveArguments
      ) repeatable on FIELD_DEFINITION | OBJECT | SCHEMA
      directive @link(
        url: String!
        as: String
        for: link__Purpose
        import: [link__Import]
      ) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION | OBJECT
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA

      scalar join__FieldSet
      scalar join__DirectiveArguments
      scalar link__Import
      enum link__Purpose {
        SECURITY
        EXECUTION
      }
      enum join__Graph {
        PRODUCTS @join__graph(name: "products", url: "http://localhost:4001")
        INVENTORY @join__graph(name: "inventory", url: "http://localhost:4002")
      }
      input ConnectHTTP {
        GET: String
      }
      input SourceHTTP {
        baseURL: String!
      }

      type Query @join__type(graph: PRODUCTS) @join__type(graph: INVENTORY) {
        # stock first so the shared source cache holds INVENTORY before Product's
        # type-level @connect is attributed - exercises preferSoleJoinType.
        stock(id: ID!): Stock
          @join__field(graph: INVENTORY)
          @connect(source: "api", http: { GET: "/stock/{$args.id}" }, selection: "id qty")
        product(id: ID!): Product
          @join__field(graph: PRODUCTS)
          @connect(source: "api", http: { GET: "/products/{$args.id}" }, selection: "id name")
      }

      type Product
        @join__type(graph: PRODUCTS, key: "id")
        @join__type(graph: PRODUCTS, key: "sku")
        @connect(
          source: "api"
          http: { GET: "/products/{$this.id}" }
          selection: "id name"
          entity: true
        ) {
        id: ID!
        sku: String
        name: String
      }

      type Stock @join__type(graph: INVENTORY, key: "id") {
        id: ID!
        qty: Int
      }
    `;

    const out = finalizeConnectorsSupergraph(before);
    const productField = out.match(/product\(id: ID!\): Product[^\n]*/)?.[0] ?? '';
    const stockField = out.match(/stock\(id: ID!\): Stock[^\n]*/)?.[0] ?? '';
    const productType = out.match(/type Product[^\n]*/)?.[0] ?? '';
    expect(productField).toMatch(/@join__directive\(graphs: \[PRODUCTS\], name: "connect"/);
    expect(stockField).toMatch(/@join__directive\(graphs: \[INVENTORY\], name: "connect"/);
    expect(stockField).not.toMatch(/@join__directive\(graphs: \[PRODUCTS\], name: "connect"/);
    // Sole join__type on Product → type-level connect stays PRODUCTS (not stolen by
    // a later field that also used source "api").
    expect(productType).toMatch(/@join__directive\(graphs: \[PRODUCTS\], name: "connect"/);
    expect(productType).not.toMatch(/@join__directive\(graphs: \[INVENTORY\], name: "connect"/);
    // Schema @source emitted for every graph that referenced "api".
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[PRODUCTS\],name:"source",args:\{name:"api"/,
    );
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[INVENTORY\],name:"source",args:\{name:"api"/,
    );
  });

  it('attributes source-less type-level @connect to the sole keyed join (value-type sibling)', () => {
    // FHIR-like: Observation contributes Reference as a value type (no key), while a
    // mini Connectors subgraph owns Reference @key + type-level @connect for resolveReference.
    const before = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"]) {
        query: Query
      }

      directive @join__graph(name: String!, url: String!) on ENUM_VALUE
      directive @join__type(
        graph: join__Graph!
        key: join__FieldSet
        extension: Boolean! = false
        resolvable: Boolean! = true
      ) repeatable on OBJECT
      directive @join__field(graph: join__Graph) on FIELD_DEFINITION
      directive @join__directive(
        graphs: [join__Graph!]
        name: String!
        args: join__DirectiveArguments
      ) repeatable on FIELD_DEFINITION | OBJECT | SCHEMA
      directive @link(url: String!, import: [link__Import], for: link__Purpose) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION | OBJECT

      scalar join__FieldSet
      scalar join__DirectiveArguments
      scalar link__Import
      enum link__Purpose {
        SECURITY
        EXECUTION
      }
      enum join__Graph {
        OBSERVATIONS @join__graph(name: "observations", url: "http://localhost:4001")
        REFERENCE_RESOURCE @join__graph(name: "referenceResource", url: "http://localhost:4002")
      }
      input ConnectHTTP {
        GET: String
      }

      type Query @join__type(graph: OBSERVATIONS) @join__type(graph: REFERENCE_RESOURCE) {
        observationById(id: ID!): Observation @join__field(graph: OBSERVATIONS)
        _referenceResource: String @join__field(graph: REFERENCE_RESOURCE)
      }

      type Observation @join__type(graph: OBSERVATIONS) {
        id: ID!
        subject: Reference
      }

      type Reference
        @join__type(graph: OBSERVATIONS)
        @join__type(graph: REFERENCE_RESOURCE, key: "reference")
        @connect(selection: "reference: $this.reference") {
        reference: String!
        resource: Patient @join__field(graph: REFERENCE_RESOURCE)
      }

      type Patient @join__type(graph: REFERENCE_RESOURCE, key: "id", resolvable: false) {
        id: ID!
      }
    `;

    const out = finalizeConnectorsSupergraph(before);
    const referenceType = out.match(/type Reference[^\n]*/)?.[0] ?? '';
    expect(referenceType).toMatch(
      /@join__directive\(graphs: \[REFERENCE_RESOURCE\], name: "connect"/,
    );
    expect(referenceType).not.toMatch(
      /@join__directive\(graphs: \[OBSERVATIONS\], name: "connect"/,
    );
    // Must not leave native @connect (Router rejects it on the Supergraph).
    expect(out).not.toMatch(/type Reference[\s\S]*@connect\(/);
  });

  it('attributes source-less type-level @connect to the owner join, not the stub', () => {
    const before = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"]) {
        query: Query
      }

      directive @join__graph(name: String!, url: String!) on ENUM_VALUE
      directive @join__type(
        graph: join__Graph!
        key: join__FieldSet
        extension: Boolean! = false
        resolvable: Boolean! = true
      ) repeatable on OBJECT
      directive @join__field(graph: join__Graph) on FIELD_DEFINITION
      directive @join__directive(
        graphs: [join__Graph!]
        name: String!
        args: join__DirectiveArguments
      ) repeatable on FIELD_DEFINITION | OBJECT | SCHEMA
      directive @link(url: String!, import: [link__Import], for: link__Purpose) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION | OBJECT

      scalar join__FieldSet
      scalar join__DirectiveArguments
      scalar link__Import
      enum link__Purpose {
        SECURITY
        EXECUTION
      }
      enum join__Graph {
        CATALOG @join__graph(name: "catalog", url: "http://localhost:4002/graphql")
        PRODUCTS @join__graph(name: "products", url: "http://localhost:4001")
      }
      input ConnectHTTP {
        GET: String
      }

      type Query @join__type(graph: CATALOG) @join__type(graph: PRODUCTS) {
        featured: Product @join__field(graph: CATALOG)
      }

      type Product
        @join__type(graph: CATALOG, key: "id", extension: true, resolvable: false)
        @join__type(graph: PRODUCTS, key: "id")
        @connect(
          http: { GET: "https://api.example.com/products/{$this.id}" }
          selection: "id name"
          entity: true
        ) {
        id: ID!
        name: String @join__field(graph: PRODUCTS)
      }
    `;

    const out = finalizeConnectorsSupergraph(before);
    const productType = out.match(/type Product[^\n]*/)?.[0] ?? '';
    expect(productType).toMatch(/@join__directive\(graphs: \[PRODUCTS\], name: "connect"/);
    expect(productType).not.toMatch(/@join__directive\(graphs: \[CATALOG\], name: "connect"/);
    expect(out).not.toMatch(/type Product[\s\S]*@connect\(/);
  });

  it('treats a graph as resolvable when any of its join keys is resolvable', () => {
    const before = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"]) {
        query: Query
      }

      directive @join__graph(name: String!, url: String!) on ENUM_VALUE
      directive @join__type(
        graph: join__Graph!
        key: join__FieldSet
        extension: Boolean! = false
        resolvable: Boolean! = true
      ) repeatable on OBJECT
      directive @join__field(graph: join__Graph) on FIELD_DEFINITION
      directive @join__directive(
        graphs: [join__Graph!]
        name: String!
        args: join__DirectiveArguments
      ) repeatable on FIELD_DEFINITION | OBJECT | SCHEMA
      directive @link(url: String!, import: [link__Import], for: link__Purpose) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION | OBJECT

      scalar join__FieldSet
      scalar join__DirectiveArguments
      scalar link__Import
      enum link__Purpose {
        SECURITY
        EXECUTION
      }
      enum join__Graph {
        CATALOG @join__graph(name: "catalog", url: "http://localhost:4002/graphql")
        PRODUCTS @join__graph(name: "products", url: "http://localhost:4001")
      }
      input ConnectHTTP {
        GET: String
      }

      type Query @join__type(graph: CATALOG) @join__type(graph: PRODUCTS) {
        featured: Product @join__field(graph: CATALOG)
      }

      type Product
        @join__type(graph: CATALOG, key: "id", extension: true, resolvable: false)
        @join__type(graph: PRODUCTS, key: "id")
        @join__type(graph: PRODUCTS, key: "sku", resolvable: false)
        @connect(
          http: { GET: "https://api.example.com/products/{$this.id}" }
          selection: "id name"
          entity: true
        ) {
        id: ID!
        sku: String
        name: String @join__field(graph: PRODUCTS)
      }
    `;

    const out = finalizeConnectorsSupergraph(before);
    const productType = out.match(/type Product[^\n]*/)?.[0] ?? '';
    expect(productType).toMatch(/@join__directive\(graphs: \[PRODUCTS\], name: "connect"/);
    expect(productType).not.toMatch(/@join__directive\(graphs: \[CATALOG\], name: "connect"/);
  });

  it('preserves per-graph @source ownership when supplied schemas share a source name', () => {
    // Two hand-supplied connector subgraphs both declare `@source(name: "api")`
    // with different baseURLs. Compose lifts extras onto schema (losing graph),
    // but Mesh `@transport(subgraph, location)` still pairs each baseURL with
    // its owning subgraph - finalize must emit each source only for that graph.
    const common = /* GraphQL */ `
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
    `;

    const products = buildSchema(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "api", http: { baseURL: "https://products.example.com" }) {
        query: Query
      }
      ${common}
      type Query {
        product(id: ID!): Product
          @connect(source: "api", http: { GET: "/products/{$args.id}" }, selection: "id name")
      }
      type Product {
        id: ID!
        name: String
      }
    `);

    const inventory = buildSchema(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "api", http: { baseURL: "https://inventory.example.com" }) {
        query: Query
      }
      ${common}
      type Query {
        stock(id: ID!): Int
          @connect(source: "api", http: { GET: "/stock/{$args.id}" }, selection: "$")
      }
    `);

    const result = composeSubgraphs([
      { name: 'products', schema: products, transforms: [s => s] },
      { name: 'inventory', schema: inventory, transforms: [s => s] },
    ]);
    expect(result.errors ?? []).toEqual([]);
    const out = result.supergraphSdl!;

    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[PRODUCTS\],name:"source",args:\{name:"api",http:\{baseURL:"https:\/\/products\.example\.com"\}\}/,
    );
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[INVENTORY\],name:"source",args:\{name:"api",http:\{baseURL:"https:\/\/inventory\.example\.com"\}\}/,
    );
    // Must not cross-attach the other graph's baseURL.
    expect(out).not.toMatch(
      /@join__directive\(graphs: \[PRODUCTS\], name: "source", args: \{name: "api", http: \{baseURL: "https:\/\/inventory\.example\.com"\}\}/,
    );
    expect(out).not.toMatch(
      /@join__directive\(graphs: \[INVENTORY\], name: "source", args: \{name: "api", http: \{baseURL: "https:\/\/products\.example\.com"\}\}/,
    );
    // Field-level connect ownership follows @join__field.
    expect(out).toMatch(
      /product\(id: ID!\): Product[\s\S]*?@join__directive\(graphs: \[PRODUCTS\], name: "connect"/,
    );
    expect(out).toMatch(
      /stock\(id: ID!\): Int[\s\S]*?@join__directive\(graphs: \[INVENTORY\], name: "connect"/,
    );
  });

  it('keeps source and connect ownership when a subgraph name equals the shared source name', () => {
    // Subgraphs `api` and `inventory` both declare `@source(name: "api")` with
    // different baseURLs. Source→subgraph name match must not attach inventory's
    // config (or its @connect) onto the `api` graph.
    const common = /* GraphQL */ `
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
    `;

    const api = buildSchema(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "api", http: { baseURL: "https://api.example.com" }) {
        query: Query
      }
      ${common}
      type Query {
        product(id: ID!): Product
          @connect(source: "api", http: { GET: "/products/{$args.id}" }, selection: "id name")
      }
      type Product {
        id: ID!
        name: String
      }
    `);

    const inventory = buildSchema(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(name: "api", http: { baseURL: "https://inventory.example.com" }) {
        query: Query
      }
      ${common}
      type Query {
        stock(id: ID!): Int
          @connect(source: "api", http: { GET: "/stock/{$args.id}" }, selection: "$")
      }
    `);

    const result = composeSubgraphs([
      { name: 'api', schema: api, transforms: [s => s] },
      { name: 'inventory', schema: inventory, transforms: [s => s] },
    ]);
    expect(result.errors ?? []).toEqual([]);
    const out = result.supergraphSdl!;

    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[API\],name:"source",args:\{name:"api",http:\{baseURL:"https:\/\/api\.example\.com"\}\}/,
    );
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[INVENTORY\],name:"source",args:\{name:"api",http:\{baseURL:"https:\/\/inventory\.example\.com"\}\}/,
    );
    expect(out).not.toMatch(
      /@join__directive\(graphs: \[API\], name: "source", args: \{name: "api", http: \{baseURL: "https:\/\/inventory\.example\.com"\}\}/,
    );
    expect(out).not.toMatch(
      /@join__directive\(graphs: \[INVENTORY\], name: "source", args: \{name: "api", http: \{baseURL: "https:\/\/api\.example\.com"\}\}/,
    );
    expect(out).toMatch(
      /product\(id: ID!\): Product[\s\S]*?@join__directive\(graphs: \[API\], name: "connect"/,
    );
    expect(out).toMatch(
      /stock\(id: ID!\): Int[\s\S]*?@join__directive\(graphs: \[INVENTORY\], name: "connect"/,
    );
    expect(out).not.toMatch(
      /stock\(id: ID!\): Int[\s\S]*?@join__directive\(graphs: \[API\], name: "connect"/,
    );
  });

  it('preserves per-graph @source when same name and baseURL differ only by headers', () => {
    // Same source name + baseURL with different headers must not cross-attach.
    // Lift keeps ownership via co-located @transport.subgraph in each extras blob.
    const common = /* GraphQL */ `
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
        headers: [HTTPHeaderMapping!]
      }
      input HTTPHeaderMapping {
        name: String!
        value: String!
      }
    `;

    const products = buildSchema(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(
          name: "api"
          http: {
            baseURL: "https://api.example.com"
            headers: [{ name: "X-Tenant", value: "products" }]
          }
        ) {
        query: Query
      }
      ${common}
      type Query {
        product(id: ID!): Product
          @connect(source: "api", http: { GET: "/products/{$args.id}" }, selection: "id name")
      }
      type Product {
        id: ID!
        name: String
      }
    `);

    const inventory = buildSchema(/* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
        @source(
          name: "api"
          http: {
            baseURL: "https://api.example.com"
            headers: [{ name: "X-Tenant", value: "inventory" }]
          }
        ) {
        query: Query
      }
      ${common}
      type Query {
        stock(id: ID!): Int
          @connect(source: "api", http: { GET: "/stock/{$args.id}" }, selection: "$")
      }
    `);

    const result = composeSubgraphs([
      { name: 'products', schema: products, transforms: [s => s] },
      { name: 'inventory', schema: inventory, transforms: [s => s] },
    ]);
    expect(result.errors ?? []).toEqual([]);
    const out = result.supergraphSdl!;

    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[PRODUCTS\],name:"source",args:\{name:"api",http:\{baseURL:"https:\/\/api\.example\.com",headers:\[\{name:"X-Tenant",value:"products"\}\]\}\}/,
    );
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[INVENTORY\],name:"source",args:\{name:"api",http:\{baseURL:"https:\/\/api\.example\.com",headers:\[\{name:"X-Tenant",value:"inventory"\}\]\}\}/,
    );
    expect(out).not.toMatch(
      /@join__directive\(graphs: \[PRODUCTS\], name: "source", args: \{name: "api", http: \{baseURL: "https:\/\/api\.example\.com", headers: \[\{name: "X-Tenant", value: "inventory"\}\]\}\}/,
    );
    expect(out).not.toMatch(
      /@join__directive\(graphs: \[INVENTORY\], name: "source", args: \{name: "api", http: \{baseURL: "https:\/\/api\.example\.com", headers: \[\{name: "X-Tenant", value: "products"\}\]\}\}/,
    );
  });

  it('strips Mesh @typescript/@example/@regexp from lean SG', () => {
    // Regression: Apollo Router connector carry-over rejects native apps already
    // printed on the SG when shared FHIR/OpenAPI pattern scalars merge across
    // Connectors subgraphs. Subgraph SDLs keep `@regexp` for Hive Connect.
    const sharedScalarSdl = /* GraphQL */ `
      directive @link(url: String!, import: [String]) repeatable on SCHEMA
      directive @composeDirective(name: String!) repeatable on SCHEMA
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
        entity: Boolean
      ) repeatable on FIELD_DEFINITION | OBJECT
      directive @regexp(subgraph: String, pattern: String) repeatable on SCALAR
      directive @typescript(subgraph: String, type: String) repeatable on SCALAR | ENUM
      directive @example(subgraph: String, value: String) repeatable on SCALAR | ENUM
      directive @enum(subgraph: String, value: String) repeatable on ENUM_VALUE

      input ConnectHTTP {
        GET: String
      }
      input SourceHTTP {
        baseURL: String!
      }

      scalar string
        @regexp(subgraph: "SUBGRAPH", pattern: "[ \\\\r\\\\n\\\\t\\\\S]+")
        @typescript(subgraph: "SUBGRAPH", type: "string")

      enum Resource_const
        @typescript(subgraph: "SUBGRAPH", type: "\\"Resource\\"")
        @example(subgraph: "SUBGRAPH", value: "Resource") {
        Resource @enum(subgraph: "SUBGRAPH", value: "\\"Resource\\"")
      }
    `;

    const patients = importMeshDirectives(
      buildSchema(
        /* GraphQL */ `
          schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(
              url: "https://specs.apollo.dev/federation/v2.6"
              import: ["@key", "@composeDirective"]
            )
            @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
            @source(name: "fhir", http: { baseURL: "https://hapi.fhir.org/baseR4" }) {
            query: Query
          }
          ${sharedScalarSdl.replaceAll('SUBGRAPH', 'patients')}
          type Query {
            patient(id: string!): Patient
              @connect(
                source: "fhir"
                http: { GET: "/Patient/{$args.id}" }
                selection: "id"
                entity: true
              )
          }
          type Patient @key(fields: "id") {
            id: string!
            resourceType: Resource_const
          }
        `,
        { assumeValidSDL: true, assumeValid: true },
      ),
      ['@regexp', '@typescript', '@example'],
    );

    const observations = importMeshDirectives(
      buildSchema(
        /* GraphQL */ `
          schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(
              url: "https://specs.apollo.dev/federation/v2.6"
              import: ["@key", "@composeDirective"]
            )
            @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
            @source(name: "fhir", http: { baseURL: "https://hapi.fhir.org/baseR4" }) {
            query: Query
          }
          ${sharedScalarSdl.replaceAll('SUBGRAPH', 'observations')}
          type Query {
            observationById(id: string!): Observation
              @connect(source: "fhir", http: { GET: "/Observation/{$args.id}" }, selection: "id")
          }
          type Observation {
            id: string!
            resourceType: Resource_const
          }
          type Patient @key(fields: "id", resolvable: false) {
            id: string!
          }
        `,
        { assumeValidSDL: true, assumeValid: true },
      ),
      ['@regexp', '@typescript', '@example'],
    );

    const result = composeSubgraphs([
      { name: 'patients', schema: patients },
      { name: 'observations', schema: observations },
    ]);
    expect(result.errors ?? []).toEqual([]);
    const sdl = result.supergraphSdl!;
    expect(sdl).toMatch(/\bscalar string\b/);
    expect(sdl).not.toMatch(/@typescript\(/);
    expect(sdl).not.toMatch(/@example\(/);
    expect(sdl).not.toMatch(/@regexp\(/);
    expect(sdl).not.toMatch(/directive @typescript\b/);
    expect(sdl).not.toMatch(/directive @regexp\b/);
  });

  it('strips post-compose @regexp from lean SG (subgraph SDL keeps it)', () => {
    // Gateway execute match/reject lives in transport-connect on subgraph /
    // executable schemas. Lean SG must not print `@regexp` or Router carry-over
    // fails with "already exists".
    const codeSdl = /* GraphQL */ `
      directive @link(url: String!, import: [String]) repeatable on SCHEMA
      directive @composeDirective(name: String!) repeatable on SCHEMA
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
      ) repeatable on FIELD_DEFINITION
      directive @regexp(subgraph: String, pattern: String) repeatable on SCALAR
      input ConnectHTTP {
        GET: String
      }
      input SourceHTTP {
        baseURL: String!
      }
      scalar Code @regexp(subgraph: "codes", pattern: "^[A-Z]{2}$")
      type Query {
        code: Code @connect(source: "api", http: { GET: "/code" }, selection: "$")
      }
    `;
    const subgraph = importMeshDirectives(
      buildSchema(
        /* GraphQL */ `
          schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@composeDirective"])
            @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
            @source(name: "api", http: { baseURL: "https://api.example.com" }) {
            query: Query
          }
          ${codeSdl}
        `,
        { assumeValidSDL: true, assumeValid: true },
      ),
      ['@regexp'],
    );
    const composed = composeSubgraphs([{ name: 'codes', schema: subgraph }]);
    expect(composed.errors ?? []).toEqual([]);
    const sg = composed.supergraphSdl!;
    expect(sg).toMatch(/\bscalar Code\b/);
    expect(sg).not.toMatch(/@regexp\(/);
    expect(sg).toMatch(/@join__directive\([^)]*name: "connect"/);
  });

  it('strips Mesh |preEncoded from lean SG connect paths (Apollo URLPathTemplate)', () => {
    // Subgraph SDL keeps `|preEncoded` for Mesh Connect; lean SG must not — Router
    // fails connector startup with `could not parse URL template: Eof`.
    const wikiSdl = /* GraphQL */ `
      directive @link(url: String!, import: [String]) repeatable on SCHEMA
      directive @composeDirective(name: String!) repeatable on SCHEMA
      directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
      directive @connect(
        source: String
        http: ConnectHTTP
        selection: String!
      ) repeatable on FIELD_DEFINITION
      input ConnectHTTP {
        GET: String
      }
      input SourceHTTP {
        baseURL: String!
      }
      type Query {
        page(article: String!): String
          @connect(
            source: "Wiki"
            http: { GET: "/page/{$args.article|preEncoded}" }
            selection: "$"
          )
      }
    `;
    const subgraph = buildSchema(
      /* GraphQL */ `
        schema
          @link(url: "https://specs.apollo.dev/link/v1.0")
          @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@composeDirective"])
          @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
          @source(name: "Wiki", http: { baseURL: "https://wikimedia.org" }) {
          query: Query
        }
        ${wikiSdl}
      `,
      { assumeValidSDL: true, assumeValid: true },
    );
    const composed = composeSubgraphs([{ name: 'wiki', schema: subgraph }]);
    expect(composed.errors ?? []).toEqual([]);
    const sg = composed.supergraphSdl!;
    expect(sg).toMatch(/\$args\.article\}/);
    expect(sg).not.toMatch(/\|preEncoded/);
  });
});
