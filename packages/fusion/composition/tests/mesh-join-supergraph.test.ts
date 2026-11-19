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
    // Empty Mesh core `@link` (no imports left) is dropped from the lean SG.
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
      /@join__directive\(graphs: \[CHINOOK\], name: "transport", args: \{kind: "sql", location: "file:chinook.db", options: \{pool: 2\}\}\)/,
    );
    expect(out).not.toMatch(/subgraph:/);
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
      /@join__directive\(graphs: \[CALC\], name: "transport", args: \{kind: "thrift", location: "http:\/\/localhost\/thrift"\}\)/,
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

  it('rewrites connect @transport with options: drop matching location and kind', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.graphql-mesh.com/core/v0.1", import: ["@transport"])
        @transport(
          kind: "connect"
          subgraph: "MicrosoftGraph"
          location: "http://127.0.0.1:4000"
          options: { odata: { batch: "json" } }
        )
        @join__directive(
          graphs: [MICROSOFT_GRAPH]
          name: "source"
          args: { name: "MicrosoftGraph", http: { baseURL: "http://127.0.0.1:4000" } }
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
        MICROSOFT_GRAPH @join__graph(name: "MicrosoftGraph", url: "http://127.0.0.1:4000")
      }

      type Query {
        ok: String
      }
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    expect(out).not.toMatch(/@transport\s*\(/);
    expect(out).not.toMatch(/directive @transport/);
    expect(out).not.toMatch(/TransportOptions/);
    expect(out).not.toMatch(/kind:\s*"connect"/);
    expect(out).toMatch(
      /@join__directive\(graphs: \[MICROSOFT_GRAPH\], name: "transport", args: \{options: \{odata: \{batch: "json"\}\}\}\)/,
    );
    expect(out).not.toMatch(/name: "transport", args: \{[^}]*location:/);
  });

  it('prunes orphan TransportOptions and unused @source def without rewrites', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.graphql-mesh.com/core/v0.1", import: ["@source"]) {
        query: Query
      }

      directive @source(
        name: String!
        type: String
        subgraph: String!
      ) repeatable on FIELD_DEFINITION | OBJECT

      scalar TransportOptions @join__type(graph: SERVICE_A) @join__type(graph: SERVICE_B)

      enum join__Graph {
        SERVICE_A @join__graph(name: "service-a", url: "http://localhost:1/graphql")
        SERVICE_B @join__graph(name: "service-b", url: "http://localhost:2/graphql")
      }

      type Query @join__type(graph: SERVICE_A) {
        ok: String @join__field(graph: SERVICE_A)
      }
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    expect(out).not.toMatch(/TransportOptions/);
    expect(out).not.toMatch(/directive @source/);
    expect(out).not.toMatch(/import: \["@source"\]/);
    expect(out).not.toMatch(/specs\.graphql-mesh\.com\/core\/v0\.1/);
    expect(out).toMatch(/type Query/);
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
    // Join-carried Mesh dirs keep the core `@link` import (no native apps/defs).
    expect(out).toMatch(
      /specs\.graphql-mesh\.com\/core\/v0\.1", import: \["@merge", \{name: "@source", as: "@meshSource"\}\]/,
    );
    // meshSource keeps subgraph (Gateway rename filter); merge drops it.
    expect(out).toMatch(
      /@join__directive\(graphs: \[VACCINATION\], name: "meshSource", args: \{name: "pet_by_id", type: "Pet", subgraph: "vaccination"\}/,
    );
    expect(out).toMatch(
      /@join__directive\(graphs: \[VACCINATION\], name: "merge", args: \{keyField: "id", keyArg: "id"\}/,
    );
    expect(out).not.toMatch(/name: "merge", args: \{[^}]*subgraph:/);
  });

  it('rewrites @thrift__rpc and thrift @transport to join__directive', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.graphql-mesh.com/thrift/v0.1", import: ["@thrift__rpc"])
        @link(url: "https://specs.graphql-mesh.com/core/v0.1", import: ["@transport"])
        @transport(
          subgraph: "calculator"
          kind: "thrift"
          location: "http://localhost/thrift"
          headers: []
        ) {
        query: Query
      }

      directive @thrift__rpc(
        subgraph: String
        function: String!
        args: String!
        selection: String!
      ) repeatable on FIELD_DEFINITION

      enum join__Graph {
        CALCULATOR @join__graph(name: "calculator", url: "http://localhost/thrift")
      }

      type Query @join__type(graph: CALCULATOR) {
        add(left: Int, right: Int): Int
          @thrift__rpc(
            subgraph: "calculator"
            function: "add"
            args: """
            1(i32): $args.left
            2(i32): $args.right
            """
            selection: "$(i32)"
          )
          @join__field(graph: CALCULATOR)
      }

      scalar TransportOptions
      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        headers: [[String]]
        options: TransportOptions
      ) repeatable on SCHEMA
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    // Lean SG: apps are join only — no native protocol def / companion enum.
    expect(out).not.toMatch(/:\s*\w+ @thrift__rpc\s*\(/);
    expect(out).not.toMatch(/@transport\s*\(/);
    expect(out).not.toMatch(/directive @thrift__rpc\(/);
    expect(out).not.toMatch(/ThriftMessageType/);
    expect(out).not.toMatch(/TransportOptions/);
    expect(out).toMatch(
      /@join__directive\(graphs: \[CALCULATOR\], name: "transport", args: \{kind: "thrift", location: "http:\/\/localhost\/thrift"\}/,
    );
    expect(out).toMatch(
      /@join__directive\(graphs: \[CALCULATOR\], name: "thrift__rpc", args: \{function: "add"/,
    );
    // Multiline thrift `args` print as GraphQL block strings inside join args.
    expect(out).toMatch(/args: """[\s\S]*1\(i32\): \$args\.left/);
    expect(out).not.toMatch(/args: "[^"]*\\n/);
    expect(out).not.toMatch(/name: "thrift__rpc", args: \{[^}]*subgraph:/);
    expect(out).toMatch(/thrift\/v0\.1", import: \["@thrift__rpc"\]/);
  });
});
