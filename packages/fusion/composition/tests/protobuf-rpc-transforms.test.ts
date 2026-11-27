import { buildSchema, print } from 'graphql';
import { getAnnotatedSubgraphs } from '../src/index.js';
import { createNamingConventionTransform } from '../src/transforms/naming-convention.js';
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
        method: String!
        args: String
        selection: String!
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
    // Arg rename must not leak into nested input.movie.year; selection keeps Movie.year.
    expect(sdl).toMatch(/args:[\s\S]*2\(int64\):\s*year/);
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
          method: String!
          args: String
          selection: String!
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

  it('does not stamp entity: true or resolvable @key when another required arg cannot be filled', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          getPetById(id: ID!, locale: String!): Pet!
            @protobuf__rpc(
              service: "Pets"
              method: "GetPet"
              args: """
              1(string): id
              2(string): locale
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
    expect(sdl).not.toMatch(/entity:\s*true/);
    // May still stamp @key for the id field, but it must not claim a resolvable entity resolver.
    expect(sdl).toMatch(/@key\(\s*fields:\s*"id"[^)]*resolvable:\s*false/);
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
          method: String!
          args: String
          selection: String!
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
    expect(sdl).not.toMatch(/entity:\s*true/);
    // Batch-only subgraph must not advertise a resolvable @key without an entity resolver.
    expect(sdl).toMatch(/@key\(\s*fields:\s*"id"[^)]*resolvable:\s*false/);
  });

  it('does not mark entity:true for equal-name list args (id: [ID!]!)', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          getPetsById(id: [ID!]!): [Pet!]!
            @protobuf__rpc(
              service: "Pets"
              method: "GetPets"
              args: """
              1(repeated string): id
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
    expect(sdl).not.toMatch(/entity:\s*true/);
    expect(sdl).toMatch(/@key\(\s*fields:\s*"id"[^)]*resolvable:\s*false/);
  });

  it.each([
    {
      name: 'batch before singular',
      queryFields: /* GraphQL */ `
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
      `,
    },
    {
      name: 'singular before batch',
      queryFields: /* GraphQL */ `
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
      `,
    },
  ])('upgrades @key when singular ById exists ($name)', ({ queryFields }) => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          ${queryFields}
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
    expect(sdl).not.toMatch(/resolvable:\s*false/);
    expect(sdl).not.toMatch(/@merge\(/);
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

  it('rewrites nested segments of $args.input.release_year via nestedRenameMap', async () => {
    const { rewriteProtobufMappingBinds } = await import('../src/transforms/utils.js');
    const out = rewriteProtobufMappingBinds('1(int64): $args.input.release_year', new Map(), {
      nestedRenameMap: new Map([['release_year', 'releaseYear']]),
    });
    expect(out).toContain('$args.input.releaseYear');
    expect(out).not.toContain('$args.input.release_year');
  });

  it('arg-only rename does not rewrite nested input.year', async () => {
    const { rewriteProtobufMappingBinds } = await import('../src/transforms/utils.js');
    const out = rewriteProtobufMappingBinds(
      '1(int64): year\n2(message): input { 1(int64): year }',
      new Map([['year', 'releaseYear']]),
      { nestedRenameMap: new Map() },
    );
    expect(out).toMatch(/^1\(int64\): releaseYear/m);
    expect(out).toContain('1(int64): year');
  });

  it('arg rename does not rewrite $this in flat args-mode first pass', async () => {
    const { rewriteProtobufMappingBinds } = await import('../src/transforms/utils.js');
    // First pass leaves `$this` alone; rename transform applies owner/arg context later.
    const out = rewriteProtobufMappingBinds(
      '1(string): $this.id\n2(string): $args.id',
      new Map([['id', 'requestId']]),
      { nestedRenameMap: new Map() },
    );
    expect(out).toContain('$this.id');
    expect(out).not.toContain('$this.requestId');
    expect(out).toContain('$args.requestId');
  });

  it('selection field rename still rewrites $this binds', async () => {
    const { rewriteProtobufMappingBinds } = await import('../src/transforms/utils.js');
    const out = rewriteProtobufMappingBinds(
      '1(string): $this.name\n2(string): name',
      new Map([['name', 'fullName']]),
    );
    expect(out).toContain('$this.fullName');
    expect(out).toMatch(/2\(string\):\s*fullName/);
  });

  it('collapses dual binds during type-level entity conversion', async () => {
    const { toTypeLevelEntityProtobufRpc } = await import('../src/connect-entity.js');
    const out = toTypeLevelEntityProtobufRpc(
      {
        service: 'Pets',
        method: 'GetPet',
        args: '1(string): $this.id|$args.requestId',
        entity: true,
      },
      'requestId',
      'id',
    );
    expect(out.args).toBe('1(string): $this.id');
    expect(out.entity).toBeUndefined();
  });

  it('dual-bind collapse stays linear on pathological $this.$ input', async () => {
    const { collapseProtobufDualThisArgsBinds } = await import('../src/transforms/utils.js');
    const poison = `$this.${'$.'.repeat(2000)}`;
    const started = Date.now();
    const out = collapseProtobufDualThisArgsBinds(`${poison}|$args.id`);
    expect(Date.now() - started).toBeLessThan(500);
    // Incomplete dotted path after `$this.` is left alone (no dual match).
    expect(out).toBe(`${poison}|$args.id`);
    expect(collapseProtobufDualThisArgsBinds('$this.id|$args.requestId')).toBe('$this.id');
  });

  it('rewrites nested $this segments with owning GraphQL types', async () => {
    const { rewriteProtobufThisBindsDual } = await import('../src/transforms/utils.js');
    const schema = buildSchema(/* GraphQL */ `
      type Address {
        street_name: String
      }
      type Pet {
        address: Address
      }
    `);
    const pet = schema.getType('Pet');
    const fieldRenameMap = new Map([
      ['Address', new Map([['street_name', 'streetName']])],
      ['Pet', new Map()],
    ]);
    const out = rewriteProtobufThisBindsDual('1(string): $this.address.street_name|$args.street', {
      argRenames: new Map([['street', 'streetName']]),
      fieldRenameMap,
      ownerType: pet,
    });
    expect(out).toBe('1(string): $this.address.streetName|$args.streetName');
  });

  it('skips # comments before detecting nested message owners', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(/* GraphQL */ `
      input MovieInput {
        year: Int
      }
      type Query {
        moviesByYear(input: MovieInput): String
      }
    `);
    const movieInput = schema.getType('MovieInput')!;
    const out = rewriteProtobufMappingBindsTypeScoped(
      '1(message): input # documentation\n{\n  2(int64): year\n}',
      new Map([['MovieInput', new Map([['year', 'publicationYear']])]]),
      { argTypes: new Map([['input', movieInput]]) },
    );
    expect(out).toMatch(/2\(int64\):\s*publicationYear/);
  });

  it('walks nested $args segments against owning input types for dual binds', async () => {
    const { rewriteProtobufThisBindsDual } = await import('../src/transforms/utils.js');
    const schema = buildSchema(/* GraphQL */ `
      input MovieInput {
        year: Int
      }
      type Query {
        moviesByYear(input: MovieInput): String
      }
    `);
    const movieInput = schema.getType('MovieInput')!;
    const out = rewriteProtobufThisBindsDual('1(int64): $this.input.year|$args.input.year', {
      fieldRenameMap: new Map([['MovieInput', new Map([['year', 'publicationYear']])]]),
      ownerType: schema.getType('Query'),
      argTypes: new Map([['input', movieInput]]),
    });
    // Parent walk cannot resolve Query.input; args walk renames MovieInput.year.
    expect(out).toBe('1(int64): $this.input.year|$args.input.publicationYear');
  });

  it('renames nested relative binds under bare $args against arg names', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const out = rewriteProtobufMappingBindsTypeScoped(
      '1(message): $args {\n  2(int64): year\n}',
      new Map(),
      { argRenameMap: new Map([['year', 'releaseYear']]) },
    );
    expect(out).toMatch(/2\(int64\):\s*releaseYear/);
  });

  it('inherits args-root through unbound nested blocks', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const out = rewriteProtobufMappingBindsTypeScoped(
      '1(message): $args {\n  2(message): {\n    3(string): id\n  }\n}',
      new Map(),
      { argRenameMap: new Map([['id', 'requestId']]) },
    );
    expect(out).toMatch(/3\(string\):\s*requestId/);
  });

  it('inherits args-root for unbound siblings after a closed unbound block', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const out = rewriteProtobufMappingBindsTypeScoped(
      '1(message): $args {\n  2(message): {\n    3(string): id\n  }\n  4(message): {\n    5(string): id\n  }\n}',
      new Map(),
      { argRenameMap: new Map([['id', 'requestId']]) },
    );
    expect(out).toMatch(/3\(string\):\s*requestId/);
    expect(out).toMatch(/5\(string\):\s*requestId/);
  });

  it('rewrites already-emitted relative dual binds on a later transform', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(/* GraphQL */ `
      input ParentInput {
        parentYear: Int
      }
      input RequestInput {
        requestYear: Int
      }
      type Movie {
        input: ParentInput
        byYear(request: RequestInput): String
      }
    `);
    const movie = schema.getType('Movie')!;
    const requestInput = schema.getType('RequestInput')!;
    const out = rewriteProtobufMappingBindsTypeScoped(
      '1(message): $this.input|$args.request {\n  2(int64): parentYear|requestYear\n}',
      new Map([
        ['ParentInput', new Map([['parentYear', 'publishedYear']])],
        ['RequestInput', new Map([['requestYear', 'releaseYear']])],
      ]),
      {
        rootType: movie,
        argTypes: new Map([['request', requestInput]]),
        skipThisBinds: true,
      },
    );
    expect(out).toContain('$this.input|$args.request');
    expect(out).toMatch(/2\(int64\):\s*publishedYear\|releaseYear/);
  });

  it('resolves argTypes via public head for chained renames with distinct inputs', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "movies", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        input InputA {
          year: Int
        }
        input InputB {
          year: Int
        }

        type Query {
          search(a: InputA!, b: InputB!): String!
            @protobuf__rpc(
              service: "Movies"
              method: "Search"
              args: """
              1(message): $args.a {
                2(int64): year
              }
              3(message): $args.b {
                2(int64): year
              }
              """
              selection: """
              1(string): ok
              """
            )
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'movies',
        schema,
        transforms: [
          createRenameTransform({
            argRenamer: ({ argName }) => {
              if (argName === 'a') return 'b';
              if (argName === 'b') return 'c';
              return argName;
            },
            fieldRenamer: ({ typeName, fieldName }) =>
              typeName === 'InputB' && fieldName === 'year' ? 'publicationYear' : fieldName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    // a→b keeps InputA.year; b→c walks InputB so year→publicationYear.
    expect(sdl).toMatch(/1\(message\):\s*\$args\.b\s*\{[^}]*2\(int64\):\s*year/s);
    expect(sdl).toMatch(/3\(message\):\s*\$args\.c\s*\{[^}]*2\(int64\):\s*publicationYear/s);
  });

  it('records $this block owner under skipThisBinds so nested binds rename', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(/* GraphQL */ `
      input MovieInput {
        year: Int
      }
      type Query {
        moviesByYear(input: MovieInput): String
      }
    `);
    const movieInput = schema.getType('MovieInput')!;
    const out = rewriteProtobufMappingBindsTypeScoped(
      '1(message): $this.input {\n  2(int64): year\n}',
      new Map([['MovieInput', new Map([['year', 'publicationYear']])]]),
      {
        argTypes: new Map([['input', movieInput]]),
        skipThisBinds: true,
      },
    );
    expect(out).toContain('$this.input');
    expect(out).toMatch(/2\(int64\):\s*publicationYear/);
  });

  it('parent-backed $this.input nested renames dualize when arg field renames diverge', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(/* GraphQL */ `
      input ParentInput {
        year: Int
      }
      input RequestInput {
        year: Int
      }
      type Movie {
        input: ParentInput
        byYear(input: RequestInput): String
      }
    `);
    const movie = schema.getType('Movie')!;
    const requestInput = schema.getType('RequestInput')!;
    const out = rewriteProtobufMappingBindsTypeScoped(
      '1(message): $this.input {\n  2(int64): year\n}',
      new Map([
        ['ParentInput', new Map([['year', 'parentYear']])],
        ['RequestInput', new Map([['year', 'requestYear']])],
      ]),
      {
        rootType: movie,
        argTypes: new Map([['input', requestInput]]),
        skipThisBinds: true,
      },
    );
    expect(out).toContain('$this.input');
    // Both keys so encode works when resolveBind falls back from parent to args.
    expect(out).toMatch(/2\(int64\):\s*parentYear\|requestYear/);
  });

  it('falls back to arg type when parent has no matching $this path', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(/* GraphQL */ `
      input RequestInput {
        year: Int
      }
      type Movie {
        id: ID
        byYear(input: RequestInput): String
      }
    `);
    const movie = schema.getType('Movie')!;
    const requestInput = schema.getType('RequestInput')!;
    const out = rewriteProtobufMappingBindsTypeScoped(
      '1(message): $this.input {\n  2(int64): year\n}',
      new Map([
        ['Movie', new Map([['year', 'movieYear']])],
        ['RequestInput', new Map([['year', 'requestYear']])],
      ]),
      {
        rootType: movie,
        argTypes: new Map([['input', requestInput]]),
        skipThisBinds: true,
      },
    );
    expect(out).toContain('$this.input');
    expect(out).toMatch(/2\(int64\):\s*requestYear/);
    expect(out).not.toMatch(/movieYear/);
  });

  it('dual $this|$args block records child owner (consecutive transform safe)', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(/* GraphQL */ `
      input ParentInput {
        year: Int
      }
      input RequestInput {
        year: Int
      }
      type Movie {
        year: Int
        input: ParentInput
        byYear(request: RequestInput): String
      }
    `);
    const movie = schema.getType('Movie')!;
    const requestInput = schema.getType('RequestInput')!;
    // After an earlier arg rename, dual bind is already present; a later Movie.year rename
    // must not rewrite the nested input.year via inherited Movie ownership.
    const out = rewriteProtobufMappingBindsTypeScoped(
      '1(message): $this.input|$args.request {\n  2(int64): year\n}',
      new Map([
        ['Movie', new Map([['year', 'movieYear']])],
        ['ParentInput', new Map([['year', 'parentYear']])],
        ['RequestInput', new Map([['year', 'requestYear']])],
      ]),
      {
        rootType: movie,
        argTypes: new Map([['request', requestInput]]),
        skipThisBinds: true,
      },
    );
    expect(out).toContain('$this.input|$args.request');
    expect(out).toMatch(/2\(int64\):\s*parentYear\|requestYear/);
    expect(out).not.toMatch(/movieYear/);
  });

  it('consecutive renames: dual $this|$args nested year keeps child owner', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "movies", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        input ParentInput {
          year: Int
        }
        input RequestInput {
          year: Int
        }

        type Movie {
          year: Int
          input: ParentInput
          byYear(input: RequestInput): String!
            @protobuf__rpc(
              service: "Movies"
              method: "ByYear"
              args: """
              1(message): $this.input {
                2(int64): year
              }
              """
              selection: """
              1(string): ok
              """
            )
        }

        type Query {
          movie: Movie
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    // First pass: arg rename input→request produces dual $this.input|$args.request.
    // Second pass: Movie.year→movieYear must not rewrite nested ParentInput.year.
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'movies',
        schema,
        transforms: [
          createRenameTransform({
            argRenamer: ({ argName }) => (argName === 'input' ? 'request' : argName),
          }),
          createRenameTransform({
            fieldRenamer: ({ typeName, fieldName }) => {
              if (typeName === 'Movie' && fieldName === 'year') return 'movieYear';
              if (typeName === 'ParentInput' && fieldName === 'year') return 'parentYear';
              return fieldName;
            },
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/\$this\.input\|\$args\.request\s*\{[^}]*parentYear/s);
    expect(sdl).not.toMatch(/\$this\.input\|\$args\.request\s*\{[^}]*movieYear/s);
  });

  it('object field: $this.input nested year dualizes when arg diverges', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "movies", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        input ParentInput {
          year: Int
        }
        input RequestInput {
          year: Int
        }

        type Movie {
          input: ParentInput
          byYear(input: RequestInput): String!
            @protobuf__rpc(
              service: "Movies"
              method: "ByYear"
              args: """
              1(message): $this.input {
                2(int64): year
              }
              """
              selection: """
              1(string): ok
              """
            )
        }

        type Query {
          movie: Movie
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'movies',
        schema,
        transforms: [
          createRenameTransform({
            fieldRenamer: ({ typeName, fieldName }) => {
              if (typeName === 'ParentInput' && fieldName === 'year') return 'parentYear';
              if (typeName === 'RequestInput' && fieldName === 'year') return 'requestYear';
              return fieldName;
            },
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    // Dual nested names when parent and arg field renames diverge.
    expect(sdl).toMatch(/\$this\.input\s*\{[^}]*parentYear\|requestYear/s);
  });

  it('applies protobuf $args renames once (a→b, b→c does not chain)', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          pet(a: ID!, b: ID!): String!
            @protobuf__rpc(
              service: "Pets"
              method: "GetPet"
              args: """
              1(string): $args.a
              2(string): $args.b
              """
              selection: """
              1(string): ok
              """
            )
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'pets',
        schema,
        transforms: [
          createRenameTransform({
            argRenamer: ({ argName }) => {
              if (argName === 'a') return 'b';
              if (argName === 'b') return 'c';
              return argName;
            },
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/pet\(b:.*c:/s);
    // `$args.a` becomes `$args.b` once — not chained to `$args.c`.
    expect(sdl).toMatch(/1\(string\):\s*\$args\.b/);
    expect(sdl).toMatch(/2\(string\):\s*\$args\.c/);
    expect(sdl).not.toMatch(/\$args\.a\b/);
  });
});

describe('$this parent vs args-fallback renames', () => {
  it('root field: dual $this.id|$args.requestId after arg rename', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          pet(id: ID!): String!
            @protobuf__rpc(
              service: "Pets"
              method: "GetPet"
              args: """
              1(string): $this.id
              2(string): $args.id
              """
              selection: """
              1(string): ok
              """
            )
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'pets',
        schema,
        transforms: [
          createRenameTransform({
            argRenamer: ({ argName }) => (argName === 'id' ? 'requestId' : argName),
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/pet\(requestId:/);
    // Keep parent key `id` and args key `requestId` when they diverge.
    expect(sdl).toMatch(/\$this\.id\|\$args\.requestId/);
    expect(sdl).toMatch(/\$args\.requestId/);
  });

  it('object field: dual $this.petId|$args.friendId when renames diverge', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          pet: Pet
        }

        type Pet {
          id: ID!
          friend(id: ID!): String!
            @protobuf__rpc(
              service: "Pets"
              method: "GetFriend"
              args: """
              1(string): $this.id
              2(string): $args.id
              """
              selection: """
              1(string): ok
              """
            )
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'pets',
        schema,
        transforms: [
          createRenameTransform({
            fieldRenamer: ({ typeName, fieldName }) =>
              typeName === 'Pet' && fieldName === 'id' ? 'petId' : fieldName,
            argRenamer: ({ typeName, fieldName, argName }) =>
              typeName === 'Pet' && fieldName === 'friend' && argName === 'id'
                ? 'friendId'
                : argName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/type Pet[\s\S]*petId:/);
    expect(sdl).toMatch(/friend\(friendId:/);
    expect(sdl).toMatch(/\$this\.petId\|\$args\.friendId/);
    expect(sdl).toMatch(/\$args\.friendId/);
  });

  it('naming convention: dual $this.request_id|$args.requestId after fieldArgumentNames camelCase', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          pet(request_id: ID!): String!
            @protobuf__rpc(
              service: "Pets"
              method: "GetPet"
              args: """
              1(string): $this.request_id
              2(string): $args.request_id
              """
              selection: """
              1(string): ok
              """
            )
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'pets',
        schema,
        transforms: [
          createNamingConventionTransform({
            fieldArgumentNames: 'camelCase',
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/pet\(requestId:/);
    // Parent key stays request_id; args fallback uses camelCased requestId.
    expect(sdl).toMatch(/\$this\.request_id\|\$args\.requestId/);
    expect(sdl).toContain('$args.requestId');
    expect(sdl).not.toContain('$args.request_id');
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
          method: String!
          args: String
          selection: String!
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

describe('type-scoped $args.input nested renames', () => {
  const schemaWithArgsInput = () =>
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "movies", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        input MovieInput {
          year: Int!
        }

        type Query {
          movies(input: MovieInput!): Movie!
            @protobuf__rpc(
              service: "Example"
              method: "GetMovies"
              args: """
              1(message): $args.input {
                2(int64): year
              }
              """
              selection: """
              1(string): name
              2(int64): year
              """
            )
        }

        type Movie {
          name: String!
          year: Int!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );

  it('createRenameTransform: renames nested bind inside $args.input against MovieInput', () => {
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'movies',
        schema: schemaWithArgsInput(),
        transforms: [
          createRenameTransform({
            fieldRenamer: ({ typeName, fieldName }) =>
              typeName === 'MovieInput' && fieldName === 'year' ? 'publicationYear' : fieldName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/input MovieInput[\s\S]*publicationYear/);
    expect(sdl).toMatch(/\$args\.input\s*\{[\s\S]*2\(int64\):\s*publicationYear/);
    expect(sdl).toMatch(/selection:[\s\S]*2\(int64\):\s*year/);
  });

  it('createRenameFieldTransform: same $args.input nested rewrite', () => {
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'movies',
        schema: schemaWithArgsInput(),
        transforms: [
          createRenameFieldTransform(({ typeName, fieldName }) =>
            typeName === 'MovieInput' && fieldName === 'year' ? 'publicationYear' : fieldName,
          ),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/\$args\.input\s*\{[\s\S]*2\(int64\):\s*publicationYear/);
  });
});

describe('object-level @protobuf__rpc rename', () => {
  it('rewrites type-level selection when Pet.name → fullName', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          pet(id: ID!): Pet
        }

        type Pet
          @protobuf__rpc(
            service: "Pets"
            method: "GetPet"
            args: """
            1(string): $this.id
            """
            selection: """
            1(string): id
            2(string): name
            """
          ) {
          id: ID!
          name: String!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'pets',
        schema,
        transforms: [
          createRenameTransform({
            fieldRenamer: ({ typeName, fieldName }) =>
              typeName === 'Pet' && fieldName === 'name' ? 'fullName' : fieldName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/type Pet[\s\S]*fullName/);
    expect(sdl).toMatch(/selection:[\s\S]*2\(string\):\s*fullName/);
    expect(sdl).not.toMatch(/selection:[\s\S]*2\(string\):\s*name\b/);
  });

  it('rekeys field renames once under chained type renames Pet→Animal, Animal→Creature', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          pet(id: ID!): Pet
          animal(id: ID!): Animal
        }

        type Pet
          @protobuf__rpc(
            service: "Pets"
            method: "GetPet"
            args: """
            1(string): $this.name
            """
            selection: """
            1(string): id
            2(string): name
            """
          ) {
          id: ID!
          name: String!
        }

        type Animal
          @protobuf__rpc(
            service: "Animals"
            method: "GetAnimal"
            args: """
            1(string): $this.name
            """
            selection: """
            1(string): id
            2(string): name
            """
          ) {
          id: ID!
          name: String!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'pets',
        schema,
        transforms: [
          createRenameTransform({
            typeRenamer: ({ typeName }) => {
              if (typeName === 'Pet') return 'Animal';
              if (typeName === 'Animal') return 'Creature';
              return typeName;
            },
            fieldRenamer: ({ typeName, fieldName }) => {
              if (typeName === 'Pet' && fieldName === 'name') return 'petName';
              if (typeName === 'Animal' && fieldName === 'name') return 'animalName';
              return fieldName;
            },
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    // Pet→Animal keeps Pet's field renames; Animal→Creature keeps Animal's (no merge overwrite).
    expect(sdl).toMatch(/type Animal[\s\S]*petName/);
    expect(sdl).toMatch(/type Creature[\s\S]*animalName/);
    expect(sdl).toMatch(/type Animal[\s\S]*\$this\.petName/);
    expect(sdl).toMatch(/type Creature[\s\S]*\$this\.animalName/);
    expect(sdl).not.toMatch(/type Creature[\s\S]*\$this\.petName/);
  });

  it('rewrites $this and selection when Pet→Animal and name→fullName together', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "pets", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          pet(id: ID!): Pet
        }

        type Pet
          @protobuf__rpc(
            service: "Pets"
            method: "GetPet"
            args: """
            1(string): $this.name
            """
            selection: """
            1(string): id
            2(string): name
            """
          ) {
          id: ID!
          name: String!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'pets',
        schema,
        transforms: [
          createRenameTransform({
            typeRenamer: ({ typeName }) => (typeName === 'Pet' ? 'Animal' : typeName),
            fieldRenamer: ({ typeName, fieldName }) =>
              typeName === 'Pet' && fieldName === 'name' ? 'fullName' : fieldName,
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/type Animal[\s\S]*fullName/);
    expect(sdl).toMatch(/args:[\s\S]*\$this\.fullName/);
    expect(sdl).not.toMatch(/args:[\s\S]*\$this\.name\b/);
    expect(sdl).toMatch(/selection:[\s\S]*2\(string\):\s*fullName/);
    expect(sdl).not.toMatch(/selection:[\s\S]*2\(string\):\s*name\b/);
  });
});

describe('rewriteProtobufMappingBindsTypeScoped ownership', () => {
  it('rewrites binds inside hoisted @Name defs against the nested message type', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(
      /* GraphQL */ `
        type Leaf {
          n: Int!
          year: Int!
        }
        type Branch {
          left: Leaf
          right: Leaf
          year: Int!
        }
        type Query {
          branch: Branch
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const fieldRenameMap = new Map<string, Map<string, string>>([
      ['Leaf', new Map([['year', 'leafYear']])],
      ['Branch', new Map([['year', 'branchYear']])],
    ]);
    // Loader-emitted shape: shared Leaf hoisted to @Leaf; binds in the def body must
    // rename against Leaf, not fall back to Branch (rootType).
    const mapping = `@Leaf {
  1(int32): n
  2(int64): year
}
1(message@Leaf): left
2(message@Leaf): right
3(int64): year`;
    const out = rewriteProtobufMappingBindsTypeScoped(mapping, fieldRenameMap, {
      rootType: schema.getType('Branch')!,
    });
    expect(out).toMatch(/@Leaf\s*\{[\s\S]*2\(int64\):\s*leafYear/);
    expect(out).not.toMatch(/@Leaf\s*\{[\s\S]*2\(int64\):\s*branchYear/);
    expect(out).toMatch(/3\(int64\):\s*branchYear/);
    expect(out).toContain('1(message@Leaf): left');
  });

  it('skips loader # headers so emitResponseSelection @Name defs still rename', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const { emitResponseSelection } = await import('../../../loaders/protobuf/src/emitMapping.js');
    const schema = buildSchema(
      /* GraphQL */ `
        type Leaf {
          n: Int!
          year: Int!
        }
        type Branch {
          left: Leaf
          right: Leaf
          year: Int!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const rootJson = {
      nested: {
        Leaf: {
          fields: {
            n: { type: 'int32', id: 1 },
            year: { type: 'int64', id: 2 },
          },
        },
        Branch: {
          fields: {
            left: { type: 'Leaf', id: 1 },
            right: { type: 'Leaf', id: 2 },
            year: { type: 'int64', id: 3 },
          },
        },
      },
    };
    const mapping = emitResponseSelection(rootJson as any, [], 'Branch');
    expect(mapping.startsWith('#')).toBe(true);
    expect(mapping).toMatch(/@Leaf\s*\{/);
    const out = rewriteProtobufMappingBindsTypeScoped(
      mapping,
      new Map([
        ['Leaf', new Map([['year', 'leafYear']])],
        ['Branch', new Map([['year', 'branchYear']])],
      ]),
      { rootType: schema.getType('Branch')! },
    );
    expect(out).toMatch(/@Leaf\s*\{[\s\S]*2\(int64\):\s*leafYear/);
    expect(out).not.toMatch(/@Leaf\s*\{[\s\S]*2\(int64\):\s*branchYear/);
    expect(out).toMatch(/3\(int64\):\s*branchYear/);
  });

  it('resolves message@Name inside inline blocks from the enclosing owner', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(
      /* GraphQL */ `
        type Leaf {
          year: Int!
        }
        type Branch {
          leaf: Leaf
          year: Int!
        }
        type Root {
          child: Branch
          year: Int!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    // `message@Leaf: leaf` sits inside `child { … }` — owner must be Branch, not Root.
    const mapping = `@Leaf {
  1(int64): year
}
1(message): child {
  1(message@Leaf): leaf
  2(int64): year
}
2(int64): year`;
    const out = rewriteProtobufMappingBindsTypeScoped(
      mapping,
      new Map([
        ['Leaf', new Map([['year', 'leafYear']])],
        ['Branch', new Map([['year', 'branchYear']])],
        ['Root', new Map([['year', 'rootYear']])],
      ]),
      { rootType: schema.getType('Root')! },
    );
    expect(out).toMatch(/@Leaf\s*\{[\s\S]*1\(int64\):\s*leafYear/);
    expect(out).not.toMatch(/@Leaf\s*\{[\s\S]*1\(int64\):\s*rootYear/);
    expect(out).not.toMatch(/@Leaf\s*\{[\s\S]*1\(int64\):\s*branchYear/);
    expect(out).toMatch(/1\(message\):\s*child\s*\{[\s\S]*2\(int64\):\s*branchYear/);
    expect(out).toMatch(/2\(int64\):\s*rootYear/);
  });

  it('resolves message@Name under bare $args against argument types', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(
      /* GraphQL */ `
        input LeafInput {
          year: Int!
        }
        type Query {
          q(input: LeafInput): String
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    // Depth-1 bind under `$args { }` must still treat `input` as an arg head.
    const mapping = `@Leaf {
  1(int64): year
}
1(message): $args {
  2(message@Leaf): input
}`;
    const out = rewriteProtobufMappingBindsTypeScoped(
      mapping,
      new Map([['LeafInput', new Map([['year', 'requestYear']])]]),
      { argTypes: new Map([['input', schema.getType('LeafInput')!]]) },
    );
    expect(out).toMatch(/@Leaf\s*\{[\s\S]*1\(int64\):\s*requestYear/);
    expect(out).not.toMatch(/@Leaf\s*\{[\s\S]*1\(int64\):\s*year\b/);
  });

  it('clears closed-block owners so unbound wrappers inherit the enclosing type', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(
      /* GraphQL */ `
        type B {
          year: Int!
          first: A
        }
        type A {
          child: C
        }
        type C {
          label: String!
          year: Int!
        }
        type Query {
          b: B
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const fieldRenameMap = new Map<string, Map<string, string>>([
      ['B', new Map([['year', 'releaseYear']])],
      ['C', new Map([['year', 'cYear']])],
    ]);
    const out = rewriteProtobufMappingBindsTypeScoped(
      `1(message): first.child {
  1(string): label
}
2(message): {
  1(int64): year
}`,
      fieldRenameMap,
      { rootType: schema.getType('B')! },
    );
    expect(out).toContain('1(string): label');
    // Unbound block after first.child closes must inherit B, not stale C.
    expect(out).toMatch(/2\(message\):\s*\{[\s\S]*1\(int64\):\s*releaseYear/);
    expect(out).not.toMatch(/1\(int64\):\s*cYear/);
  });

  it('ignores bind-like text and braces inside # comments', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(
      /* GraphQL */ `
        input MovieInput {
          year: Int!
        }
        type Query {
          q(input: MovieInput): String
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const out = rewriteProtobufMappingBindsTypeScoped(
      `1(message): input {
  # 2(int64): ignored }
  2(int64): year
}`,
      new Map([['MovieInput', new Map([['year', 'publicationYear']])]]),
      { argTypes: new Map([['input', schema.getType('MovieInput')!]]) },
    );
    expect(out).toContain('# 2(int64): ignored }');
    expect(out).toMatch(/2\(int64\):\s*publicationYear/);
    expect(out).not.toMatch(/^\s*2\(int64\):\s*year\s*$/m);
  });

  it('unbound sibling inside input inherits MovieInput, not stale ChildInput', async () => {
    const { rewriteProtobufMappingBindsTypeScoped } = await import('../src/transforms/utils.js');
    const schema = buildSchema(
      /* GraphQL */ `
        input MovieInput {
          year: Int!
          child: ChildInput
        }
        input ChildInput {
          year: Int!
        }
        type Query {
          q(input: MovieInput): String
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const fieldRenameMap = new Map<string, Map<string, string>>([
      ['MovieInput', new Map([['year', 'publicationYear']])],
      ['ChildInput', new Map([['year', 'childYear']])],
    ]);
    const out = rewriteProtobufMappingBindsTypeScoped(
      `1(message): input {
  2(message): child { 1(int64): year }
  3(message): { 1(int64): year }
}`,
      fieldRenameMap,
      { argTypes: new Map([['input', schema.getType('MovieInput')!]]) },
    );
    expect(out).toMatch(/2\(message\):\s*child\s*\{\s*1\(int64\):\s*childYear/);
    // Sibling unbound block must inherit MovieInput after child closes.
    expect(out).toMatch(/3\(message\):\s*\{\s*1\(int64\):\s*publicationYear/);
    expect(out).not.toMatch(/3\(message\):\s*\{[^}]*childYear/);
  });

  it('rename transform rewrites nested fields inside loader-emitted @Name defs', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        schema @transport(subgraph: "dag", kind: "protobuf", location: "http://localhost:1") {
          query: Query
        }

        type Query {
          branch: Branch!
            @protobuf__rpc(
              service: "Example"
              method: "GetBranch"
              selection: """
              @Leaf {
                1(int32): n
                2(int64): year
              }
              1(message@Leaf): left
              2(message@Leaf): right
              3(int64): year
              """
            )
        }

        type Branch {
          left: Leaf
          right: Leaf
          year: Int!
        }

        type Leaf {
          n: Int!
          year: Int!
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'dag',
        schema,
        transforms: [
          createRenameTransform({
            fieldRenamer: ({ typeName, fieldName }) => {
              if (typeName === 'Leaf' && fieldName === 'year') return 'leafYear';
              if (typeName === 'Branch' && fieldName === 'year') return 'branchYear';
              return fieldName;
            },
          }),
        ],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    expect(sdl).toMatch(/@Leaf\s*\{[\s\S]*2\(int64\):\s*leafYear/);
    expect(sdl).not.toMatch(/@Leaf\s*\{[\s\S]*2\(int64\):\s*branchYear/);
    expect(sdl).toMatch(/3\(int64\):\s*branchYear/);
    expect(sdl).toContain('leafYear:');
    expect(sdl).toContain('branchYear:');
  });
});

describe('naming-convention type-scoped protobuf field renames', () => {
  it('does not rewrite ConnectHTTP.GET when Movie.GET becomes get', () => {
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
          method: String!
          args: String
          selection: String!
          stream: Boolean
          entity: Boolean
        ) on FIELD_DEFINITION | OBJECT

        input ConnectHTTP {
          GET: String
          POST: String
        }

        input Movie {
          GET: String
          Title: String
        }

        schema @transport(subgraph: "movies", kind: "protobuf", location: "localhost:1") {
          query: Query
        }

        type Query {
          fetch(input: ConnectHTTP): String!
            @protobuf__rpc(
              service: "Example"
              method: "Fetch"
              args: """
              1(message): input {
                1(string): GET
              }
              """
              selection: """
              1(string): ok
              """
            )
          movie(input: Movie): String!
            @protobuf__rpc(
              service: "Example"
              method: "Movie"
              args: """
              1(message): input {
                1(string): GET
                2(string): Title
              }
              """
              selection: """
              1(string): ok
              """
            )
        }
      `,
      { assumeValid: true, assumeValidSDL: true },
    );
    const annotated = getAnnotatedSubgraphs([
      {
        name: 'movies',
        schema,
        transforms: [createNamingConventionTransform({ fieldNames: 'camelCase' })],
      },
    ]);
    const sdl = print(annotated[0].typeDefs);
    // ConnectHTTP.GET stays; Movie.GET → get.
    expect(sdl).toMatch(/input ConnectHTTP[\s\S]*\bGET:/);
    expect(sdl).toMatch(/input Movie[\s\S]*\bget:/);
    const fetchArgs = sdl.match(/method:\s*"Fetch",\s*args:\s*"([^"]*)"/)?.[1] ?? '';
    const movieArgs = sdl.match(/method:\s*"Movie",\s*args:\s*"([^"]*)"/)?.[1] ?? '';
    expect(fetchArgs).toMatch(/1\(string\):\s*GET/);
    expect(fetchArgs).not.toMatch(/1\(string\):\s*get\b/);
    expect(movieArgs).toMatch(/1\(string\):\s*get\b/);
    expect(movieArgs).toMatch(/2\(string\):\s*title/);
  });
});
