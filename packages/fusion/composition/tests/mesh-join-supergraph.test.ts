import { finalizeMeshJoinDirectives } from '../src/mesh-join-supergraph.js';
import { compactGql } from './compactGql.js';

describe('finalizeMeshJoinDirectives (GM-41)', () => {
  it('drops pure http @transport when location matches join__graph url', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])
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
    // No native SCHEMA `@transport` apps - only the def (Apollo reconstitution) + join.
    expect(out).not.toMatch(/(?<!directive )@transport\s*\(/);
    expect(out).toMatch(/directive @transport/);
    expect(out).toMatch(/scalar TransportOptions/);
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[CHINOOK\],name:"transport",args:\{kind:"sql",location:"file:chinook.db",options:\{pool:2\}\}\)/,
    );
    // Join transport args omit subgraph (graphs: owns it); def may still declare the arg.
    expect(out).not.toMatch(/name: "transport", args: \{[^}]*subgraph:/);
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
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[API\],name:"transport",args:\{kind:"http",location:"http:\/\/override:9999"\}\)/,
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
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[CALC\],name:"transport",args:\{kind:"thrift",location:"http:\/\/localhost\/thrift"\}\)/,
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
        @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])
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
    // Native `@transport` with def-required kind/subgraph - not join-carried
    // (Apollo Connectors reject Mesh join transport reconstitution).
    expect(compactGql(out)).toMatch(
      /@transport\(kind:"connect",subgraph:"MicrosoftGraph",location:"http:\/\/127\.0\.0\.1:4000",options:\{odata:\{batch:"json"\}\}\)/,
    );
    expect(out).toMatch(/directive @transport/);
    expect(out).toMatch(/TransportOptions/);
    expect(out).not.toMatch(/name: "transport"/);
  });

  it('prunes orphan TransportOptions and unused @source def without rewrites', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@source"]) {
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
          url: "https://specs.graphql-mesh.dev/core/v0.1"
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
    expect(compactGql(out)).toMatch(
      /specs\.graphql-mesh\.dev\/core\/v0\.1",import:\["@merge",\{name:"@source",as:"@meshSource"\}\]/,
    );
    // meshSource keeps subgraph (Gateway rename filter); merge drops it.
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[VACCINATION\],name:"meshSource",args:\{name:"pet_by_id",type:"Pet",subgraph:"vaccination"\}/,
    );
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[VACCINATION\],name:"merge",args:\{keyField:"id",keyArg:"id"\}/,
    );
    expect(out).not.toMatch(/name: "merge", args: \{[^}]*subgraph:/);
  });

  it('keeps native @merge when subgraph is empty string (no sibling-graph fallback)', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@merge"]) {
        query: Query
      }

      directive @merge(
        subgraph: String
        keyArg: String
        keyField: String
      ) repeatable on FIELD_DEFINITION

      enum join__Graph {
        LIVE @join__graph(name: "live", url: "http://localhost/live")
      }

      type Query @join__type(graph: LIVE) {
        byId(id: ID!): String
          @merge(subgraph: "", keyField: "id", keyArg: "id")
          @join__field(graph: LIVE)
      }
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    // Empty explicit owner must not be rewritten onto LIVE - leave native.
    expect(out).toMatch(/@merge\(subgraph: "", keyField: "id", keyArg: "id"\)/);
    expect(out).not.toMatch(/name:\s*"merge"/);
  });

  it('rewrites @thrift__rpc and thrift @transport to join__directive', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.graphql-mesh.dev/thrift/v0.1", import: ["@thrift__rpc"])
        @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])
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
    // Lean SG: apps are join only - `@transport` def stays for Apollo reconstitution.
    expect(out).not.toMatch(/:\s*\w+ @thrift__rpc\s*\(/);
    expect(out).not.toMatch(/(?<!directive )@transport\s*\(/);
    expect(out).not.toMatch(/directive @thrift__rpc\(/);
    expect(out).not.toMatch(/ThriftMessageType/);
    expect(out).toMatch(/directive @transport/);
    expect(out).toMatch(/TransportOptions/);
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[CALCULATOR\],name:"transport",args:\{kind:"thrift",location:"http:\/\/localhost\/thrift"\}/,
    );
    expect(compactGql(out)).toMatch(
      /@join__directive\(graphs:\[CALCULATOR\],name:"thrift__rpc",args:\{function:"add"/,
    );
    // Supergraph: no `"""` blocks - newlines stay as `\n` escapes inside `"…"`.
    // Subgraph SDL may still print thrift args as multiline `"""`.
    // Spaces inside the quoted thrift arg template are preserved (string-safe compact).
    expect(compactGql(out)).toMatch(/args:"1\(i32\):\s*\$args\.left\\n2\(i32\):\s*\$args\.right"/);
    expect(out).not.toMatch(/args: """/);
    expect(out).not.toMatch(/name: "thrift__rpc", args: \{[^}]*subgraph:/);
    expect(compactGql(out)).toMatch(/thrift\/v0\.1",import:\["@thrift__rpc"\]/);
  });

  it('strips @regexp / @typescript / @example from lean SG scalars', () => {
    // Router connector carry-over re-applies subgraph copies; native apps on the
    // printed SG → "Directive application @regexp already exists".
    const sdl = /* GraphQL */ `
      extend schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(
          url: "https://specs.apollo.dev/join/v0.3"
          import: ["@join__graph", "@join__type", "@join__field"]
        )
        @link(
          url: "https://specs.graphql-mesh.dev/core/v0.1"
          import: ["@typescript", "@regexp", "@example"]
        )

      directive @typescript(type: String!) on SCALAR
      directive @regexp(pattern: String!) on SCALAR
      directive @example(value: String) on SCALAR

      enum join__Graph {
        REST @join__graph(name: "REST", url: "https://api.example.com")
      }

      scalar Code
        @join__type(graph: REST)
        @typescript(type: "string")
        @regexp(pattern: "^[A-Z]{2}$")
        @example(value: "AB")
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    expect(out).toMatch(/\bscalar Code\b/);
    expect(out).not.toMatch(/@regexp\(/);
    expect(out).not.toMatch(/@typescript\(/);
    expect(out).not.toMatch(/@example\(/);
    expect(out).not.toMatch(/directive @regexp\b/);
  });

  it('strips duplicate @regexp on merged FHIR scalars (Apollo Router carry-over)', () => {
    const sdl = /* GraphQL */ `
      extend schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", import: ["@join__graph", "@join__type"])
        @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@regexp"])

      directive @regexp(subgraph: String, pattern: String) repeatable on SCALAR

      enum join__Graph {
        PATIENTS @join__graph(name: "patients", url: "https://hapi.example/patients")
        OBS @join__graph(name: "observations", url: "https://hapi.example/obs")
      }

      scalar TriggerDefinition_timingDate
        @join__type(graph: PATIENTS)
        @join__type(graph: OBS)
        @regexp(subgraph: "patients", pattern: "([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)")
        @regexp(
          subgraph: "observations"
          pattern: "([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)"
        )
    `;
    const out = finalizeMeshJoinDirectives(sdl);
    const scalarBlock = out.match(/scalar TriggerDefinition_timingDate[^\n]*/)?.[0] ?? '';
    expect(scalarBlock).not.toMatch(/@regexp\(/);
    expect(out).not.toMatch(/directive @regexp\b/);
  });
});
