import { buildSchema, print } from 'graphql';
import { getAnnotatedSubgraphs } from '../src/index.js';
import { createRenameFieldTransform, createRenameTransform } from '../src/transforms/rename.js';

/**
 * Protobuf RPC follows the Federation Connectors transform posture: skip Mesh
 * `@source` / `@meshSource` / `@merge`, rewrite `@protobuf__rpc(args|selection)`
 * binds to the public GraphQL names, and stamp `@key` + `entity: true` for ById.
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
        entity: Boolean
      ) on FIELD_DEFINITION | OBJECT

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

describe('protobuf RPC rename transform (Connect-like rewrite)', () => {
  it('rewrites @protobuf__rpc args binds and skips Mesh @source/@merge', () => {
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
    // Args bind rewritten; selection keeps Movie.year (arg rename ≠ field rename).
    expect(sdl).toMatch(/args:[\s\S]*2\(int64\):\s*releaseYear/);
    expect(sdl).toMatch(/selection:[\s\S]*2\(int64\):\s*year/);
    expect(sdl).not.toMatch(/@source\(/);
    expect(sdl).not.toMatch(/@meshSource\(/);
    expect(sdl).not.toMatch(/@merge\(/);
  });
});

describe('protobuf RPC semantic conventions (entity: true)', () => {
  it('stamps @key + entity: true instead of @merge for ById fields', () => {
    const schema = buildSchema(
      /* GraphQL */ `
        directive @transport(
          subgraph: String!
          kind: String!
          location: String
        ) repeatable on SCHEMA

        directive @protobuf__rpc(
          subgraph: String
          service: String
          method: String
          args: String
          selection: String
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          getPetById(id: ID!): Pet!
            @protobuf__rpc(
              service: "Pets"
              method: "GetPet"
              args: """
              1(string): id
              """
              selection: """
              1(string): id
              2(string): name
              """
            )
        }

        type Pet {
          id: ID!
          name: String!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([{ name: 'pets', schema }]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/entity:\s*true/);
    expect(sdl).toMatch(/@key\(\s*fields:\s*"id"/);
    expect(sdl).not.toMatch(/@merge\(/);
    expect(sdl).not.toMatch(/@source\(/);
  });

  it('does not rewrite batch ByIds list args to $this.id', () => {
    const schema = buildSchema(
      /* GraphQL */ `
        directive @transport(
          subgraph: String!
          kind: String!
          location: String
        ) repeatable on SCHEMA

        directive @protobuf__rpc(
          subgraph: String
          service: String
          method: String
          args: String
          selection: String
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          getPetsByIds(ids: [ID!]!): [Pet!]!
            @protobuf__rpc(
              service: "Pets"
              method: "GetPets"
              args: """
              1(repeated string): ids
              """
              selection: """
              1(string): id
              2(string): name
              """
            )
        }

        type Pet {
          id: ID!
          name: String!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([{ name: 'pets', schema }]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/1\(repeated string\):\s*ids/);
    expect(sdl).not.toMatch(/\$this\.id/);
    expect(sdl).toMatch(/@key\(\s*fields:\s*"id"/);
  });
});

describe('rewriteProtobufMappingBinds', () => {
  it('rewrites compact binds before } once (no a→b→c chain)', async () => {
    const { rewriteProtobufMappingBinds } = await import('../src/transforms/utils.js');
    const rename = new Map([
      ['a', 'b'],
      ['b', 'c'],
      ['year', 'releaseYear'],
    ]);
    const out = rewriteProtobufMappingBinds(
      '1(message): input { 2(int64): year 3(string): $args.a }',
      rename,
    );
    expect(out).toContain('2(int64): releaseYear');
    expect(out).toContain('$args.b');
    expect(out).not.toContain('$args.c');
    expect(out).not.toContain(': year }');
  });

  it('keeps arg roots when nested field renames are separate', async () => {
    const { rewriteProtobufMappingBinds } = await import('../src/transforms/utils.js');
    const out = rewriteProtobufMappingBinds(
      '1(int64): release_year\n1(message): input { 2(int64): release_year }',
      new Map(),
      { nestedRenameMap: new Map([['release_year', 'releaseYear']]) },
    );
    expect(out).toMatch(/^1\(int64\): release_year/m);
    expect(out).toContain('2(int64): releaseYear');
  });
});

describe('type-scoped protobuf field renames (overlapping names)', () => {
  const schemaWithMovieAndReview = () =>
    buildSchema(
      /* GraphQL */ `
        directive @transport(
          subgraph: String!
          kind: String!
          location: String
        ) repeatable on SCHEMA

        directive @protobuf__rpc(
          subgraph: String
          service: String
          method: String
          args: String
          selection: String
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "media", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          movie(id: ID!): Movie!
            @protobuf__rpc(
              service: "Media"
              method: "GetMovie"
              args: """
              1(string): id
              """
              selection: """
              1(string): name
              2(int64): year
              3(message): review {
                1(string): body
                2(int64): year
              }
              """
            )
        }

        type Movie {
          name: String!
          year: Int!
          review: Review!
        }

        type Review {
          body: String!
          year: Int!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );

  it('createRenameTransform: Review.year rename does not rewrite Movie.year', () => {
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'media',
        schema: schemaWithMovieAndReview(),
        transforms: [
          createRenameTransform({
            fieldRenamer: ({ typeName, fieldName }) =>
              typeName === 'Review' && fieldName === 'year' ? 'publicationYear' : fieldName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/type Review[\s\S]*publicationYear/);
    expect(sdl).toMatch(/type Movie[\s\S]*\byear:/);
    // Nested Review.year rewritten; Movie.year at the same selection root unchanged.
    expect(sdl).toMatch(
      /selection:[\s\S]*2\(int64\):\s*year[\s\S]*review\s*\{[\s\S]*2\(int64\):\s*publicationYear/,
    );
    expect(sdl).not.toMatch(/selection:[\s\S]*1\(string\):\s*name\s*2\(int64\):\s*publicationYear/);
  });

  it('createRenameFieldTransform: same owning-type rewrite (no flattenFieldRenameMap)', () => {
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'media',
        schema: schemaWithMovieAndReview(),
        transforms: [
          createRenameFieldTransform(({ typeName, fieldName }) =>
            typeName === 'Review' && fieldName === 'year' ? 'publicationYear' : fieldName,
          ),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(
      /selection:[\s\S]*2\(int64\):\s*year[\s\S]*review\s*\{[\s\S]*2\(int64\):\s*publicationYear/,
    );
    expect(sdl).toContain('publicationYear');
  });
});
