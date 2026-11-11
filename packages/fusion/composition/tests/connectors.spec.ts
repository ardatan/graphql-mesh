import { buildSchema, print } from 'graphql';
import { getAnnotatedSubgraphs, isApolloConnectorsSubgraph } from '../src/index.js';
import { createRenameTransform } from '../src/transforms/rename.js';

describe('Apollo Connectors composition', () => {
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
    ) repeatable on FIELD_DEFINITION

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

  it('detects Apollo Connectors subgraphs', () => {
    expect(isApolloConnectorsSubgraph(connectorsSchema)).toBe(true);
    expect(
      isApolloConnectorsSubgraph(
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
    // Stitching source uses `subgraph:`; Apollo SCHEMA source is moved to extras
    // so Mesh composeDirective `@source` can coexist in mixed supergraphs.
    expect(sdl).not.toMatch(/@source\([^)]*subgraph:/);
    expect(sdl).not.toMatch(/import:\s*\[[^\]]*@source/);
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
    // Apollo `@source` is carried via Mesh `@extraSchemaDefinitionDirective` on Query.
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
});
