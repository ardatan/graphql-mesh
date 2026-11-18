import { finalizeMeshJoinDirectives } from '../src/mesh-join-supergraph.js';

describe('finalizeMeshJoinDirectives (GM-41 safe subset)', () => {
  it('drops pure http @transport when location matches join__graph url', () => {
    const sdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
        @link(url: "https://specs.graphql-mesh.com/core/v0.1", import: ["@transport"])
        @transport(subgraph: "users", kind: "http", location: "http://localhost:4001") {
        query: Query
      }

      directive @transport(
        subgraph: String!
        kind: String!
        location: String
      ) repeatable on SCHEMA

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
    expect(out).not.toMatch(/specs\.graphql-mesh\.com\/core\/v0\.1/);
    expect(out).toMatch(/@join__graph\(name: "users", url: "http:\/\/localhost:4001"\)/);
  });

  it('strips redundant location from non-http @transport but keeps subgraph/kind/options', () => {
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
    expect(out).toMatch(/@transport\(/);
    expect(out).toMatch(/kind:\s*"sql"/);
    expect(out).toMatch(/subgraph:\s*"chinook"/);
    expect(out).toMatch(/options:/);
    expect(out).not.toMatch(/location:\s*"file:chinook\.db"/);
  });

  it('keeps @transport when location differs from join__graph url', () => {
    const sdl = /* GraphQL */ `
      schema
        @transport(subgraph: "api", kind: "http", location: "http://override:9999") {
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
    expect(out).toMatch(/location:\s*"http:\/\/override:9999"/);
  });
});
