import { buildSchema, print } from 'graphql';
import { getAnnotatedSubgraphs } from '../src/index.js';
import { createRenameTransform } from '../src/transforms/rename.js';

/**
 * Mesh non-connector transforms stamp `@source(name: <pre-rename>)` then rename the
 * GraphQL argument. Runtime subgraph args stay on the @source name, so
 * `@protobuf__rpc(args:)` binds must keep the original names — unlike Federation
 * Connectors, which rewrite `$args.*` because they never get Mesh `@source`.
 */
const protobufRpcSchema = () =>
  buildSchema(
    /* GraphQL */ `
      directive @transport(
        subgraph: String!
        kind: String!
        location: String
        headers: [[String]]
      ) repeatable on SCHEMA

      directive @protobuf__rpc(
        subgraph: String
        service: String
        method: String
        args: String
        selection: String
        stream: Boolean
      ) on FIELD_DEFINITION

      schema @transport(subgraph: "movies", kind: "protobuf", location: "http://localhost:1") {
        query: Query
      }

      type Query {
        moviesByYear(year: Int!): MoviesResult!
          @protobuf__rpc(
            service: "Example"
            method: "GetMovies"
            args: """
              1(message): input.movie {
                2(int64): year
              }
            """
            selection: """
              1(repeated message): result {
                1(string): name
                2(int64): year
              }
            """
          )
      }

      type MoviesResult {
        result: [Movie!]!
      }

      type Movie {
        name: String!
        year: Int!
      }
    `,
    { assumeValid: true, assumeValidSDL: true },
  );

describe('protobuf RPC rename transform (@source, no mapping rewrite)', () => {
  it('renames the public arg and keeps @protobuf__rpc binds on the source name', () => {
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'movies',
        schema: protobufRpcSchema(),
        transforms: [
          createRenameTransform({
            argRenamer: ({ argName, fieldName }) =>
              fieldName === 'moviesByYear' && argName === 'year' ? 'releaseYear' : argName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toContain('moviesByYear(releaseYear:');
    expect(sdl).toMatch(/@source\(\s*name:\s*"year"/);
    // Mapping stays on the pre-rename / @source name used at runtime.
    expect(sdl).toMatch(/2\(int64\):\s*year/);
    expect(sdl).not.toMatch(/2\(int64\):\s*releaseYear/);
    // Authors never add @merge / @connect / @meshSource — Mesh stamps @source itself.
    expect(sdl).not.toMatch(/@merge\(/);
    expect(sdl).not.toMatch(/@connect\(/);
    expect(sdl).not.toMatch(/@meshSource\(/);
  });
});
