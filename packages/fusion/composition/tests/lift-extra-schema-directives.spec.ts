import { buildSchema, print } from 'graphql';
import {
  composeSubgraphs,
  getAnnotatedSubgraphs,
  liftExtraSchemaDefinitionDirectives,
} from '../src/index.js';
import { createRenameTransform } from '../src/transforms/rename.js';

describe('liftExtraSchemaDefinitionDirectives', () => {
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

      directive @extraSchemaDefinitionDirective(directives: _DirectiveExtensions) repeatable on OBJECT
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

    // Must parse as a valid schema for Hive/Mesh consumers
    expect(() => buildSchema(lifted, { assumeValidSDL: true })).not.toThrow();
  });
});

describe('composeSubgraphs meshSource + lift', () => {
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

  it('composes connectors with schema @source/@transport and no extras', () => {
    const result = composeSubgraphs([{ name: 'REST', schema: connectorsSchema }]);
    expect(result.errors).toBeUndefined();
    const sdl = result.supergraphSdl!;
    expect(sdl).not.toContain('extraSchemaDefinitionDirective');
    expect(sdl).toMatch(/@source\(name: "rest"/);
    expect(sdl).toMatch(/@transport\(subgraph: "REST"/);
    expect(sdl).toMatch(/import: \["@connect", "@source"\]/);
  });

  it('aliases stitching source as @meshSource when transforms are present', () => {
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
    expect(annotatedSdl).toContain('@meshSource');
    expect(annotatedSdl).toMatch(/import:\s*\[[^\]]*@meshSource/);
    expect(annotatedSdl).not.toMatch(/directive @source\(/);

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
    expect(sdl).toContain('@meshSource');
    expect(sdl).toMatch(/@transport\(subgraph: "REST"/);
    expect(sdl).not.toContain('extraSchemaDefinitionDirective');
  });
});
