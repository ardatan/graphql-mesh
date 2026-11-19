import { finalizeMeshJoinDirectives } from '../src/mesh-join-supergraph.js';

describe('finalizeMeshJoinDirectives (GM-41)', () => {
  it('drops pure http @transport when location matches join__graph url', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.graphql-mesh.com/core/v0.1", import: ["@transport"])
        @transport(subgraph: "users", kind: "http", location: "http://localhost:4001") {
        query: Query
      }

      directive @transport(subgraph: String!, kind: String!, location: String) repeatable on SCHEMA

      enum join__Graph {
        USERS @join__graph(name: "users", url: "http://localhost:4001")
      }

      type Query {
        me: String
      }
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    expect(out).not.toMatch(/@transport\s*\(/);
    expect(out).not.toMatch(/directive @transport/);
    expect(out).not.toMatch(/name:\s*"transport"/);
    expect(out).not.toMatch(/specs\.graphql-mesh\.com\/core\/v0\.1/);
    expect(out).toMatch(/@join__graph\(name: "users", url: "http:\/\/localhost:4001"\)/);
  });

  it('rewrites non-http @transport to @join__directive without matching subgraph/location', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @transport(
          subgraph: "chinook"
          kind: "sql"
          location: "file:chinook.db"
          options: { pool: 2 }
        ) {
        query: Query
      }

      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        options: TransportOptions
      ) repeatable on SCHEMA
      scalar TransportOptions

      enum join__Graph {
        CHINOOK @join__graph(name: "chinook", url: "file:chinook.db")
      }

      type Query {
        albums: String
      }
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    expect(out).not.toMatch(/@transport\s*\(/);
    expect(out).not.toMatch(/directive @transport/);
    expect(out).not.toMatch(/scalar TransportOptions/);
    expect(out).toMatch(
      /@join__directive\(graphs: \[CHINOOK\], name: "transport", args: \{kind: "sql", options: \{pool: 2\}\}\)/,
    );
    expect(out).not.toMatch(/subgraph:/);
    expect(out).not.toMatch(/location:/);
    expect(out).toMatch(/specs\.apollo\.dev\/join\/v0\.5/);
    expect(out).toMatch(/directive @join__directive/);
  });

  it('keeps override location on @join__directive args', () => {
    const sdl = /* GraphQL */ `
      schema @transport(subgraph: "api", kind: "http", location: "http://override:9999") {
        query: Query
      }

      enum join__Graph {
        API @join__graph(name: "api", url: "http://localhost:4001")
      }

      type Query {
        ok: String
      }
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    expect(out).toMatch(
      /@join__directive\(graphs: \[API\], name: "transport", args: \{kind: "http", location: "http:\/\/override:9999"\}\)/,
    );
    expect(out).not.toMatch(/@transport\s*\(/);
  });

  it('drops empty headers when rewriting', () => {
    const sdl = /* GraphQL */ `
      schema
        @transport(
          subgraph: "calc"
          kind: "thrift"
          location: "http://localhost/thrift"
          headers: []
        ) {
        query: Query
      }

      enum join__Graph {
        CALC @join__graph(name: "calc", url: "http://localhost/thrift")
      }

      type Query {
        add: Int
      }
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    expect(out).toMatch(
      /@join__directive\(graphs: \[CALC\], name: "transport", args: \{kind: "thrift"\}\)/,
    );
    expect(out).not.toMatch(/headers:/);
  });

  it('drops connect @transport without options (Gateway infers)', () => {
    const sdl = /* GraphQL */ `
      schema
        @transport(subgraph: "REST", kind: "connect", location: "https://api.example.com")
        @join__directive(
          graphs: [REST]
          name: "source"
          args: { name: "rest", http: { baseURL: "https://api.example.com" } }
        ) {
        query: Query
      }

      enum join__Graph {
        REST @join__graph(name: "REST", url: "https://api.example.com")
      }

      type Query {
        ok: String
      }
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    expect(out).not.toMatch(/@transport\s*\(/);
    expect(out).not.toMatch(/name: "transport"/);
    expect(out).toMatch(/name: "source"/);
  });

  it('rewrites @merge/@meshSource to join__directive without subgraph arg or defs', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(
          url: "https://specs.graphql-mesh.com/core/v0.1"
          import: ["@merge", { name: "@source", as: "@meshSource" }]
        ) {
        query: Query
      }

      directive @merge(
        subgraph: String
        keyArg: String
        keyField: String
      ) repeatable on FIELD_DEFINITION

      directive @meshSource(
        name: String!
        type: String
        subgraph: String!
      ) repeatable on FIELD_DEFINITION

      enum join__Graph {
        VACCINATION @join__graph(name: "vaccination", url: "http://localhost/graphql")
      }

      type Query @join__type(graph: VACCINATION) {
        petById(id: ID!): Pet
          @meshSource(name: "pet_by_id", type: "Pet", subgraph: "vaccination")
          @merge(subgraph: "vaccination", keyField: "id", keyArg: "id")
          @join__field(graph: VACCINATION)
      }

      type Pet @join__type(graph: VACCINATION, key: "id") {
        id: ID!
      }
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    expect(out).not.toMatch(/@merge\s*\(/);
    expect(out).not.toMatch(/@meshSource\s*\(/);
    expect(out).not.toMatch(/directive @merge/);
    expect(out).not.toMatch(/directive @meshSource/);
    expect(out).not.toMatch(/specs\.graphql-mesh\.com\/core\/v0\.1/);
    // meshSource keeps subgraph (Gateway rename filter); merge drops it.
    expect(out).toMatch(
      /@join__directive\(graphs: \[VACCINATION\], name: "meshSource", args: \{name: "pet_by_id", type: "Pet", subgraph: "vaccination"\}/,
    );
    expect(out).toMatch(
      /@join__directive\(graphs: \[VACCINATION\], name: "merge", args: \{keyField: "id", keyArg: "id"\}/,
    );
    expect(out).not.toMatch(/name: "merge", args: \{[^}]*subgraph:/);
  });
});
