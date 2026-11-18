import {
  buildSchema,
  DirectiveLocation,
  GraphQLDirective,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { ensureFederationReadySubgraph } from '@graphql-mesh/utils';
import { getDirectiveExtensions, printSchemaWithDirectives } from '@graphql-tools/utils';

describe('ensureFederationReadySubgraph', () => {
  it('imports Mesh directives with @composeDirective and Mesh @link', () => {
    const sqlDirective = new GraphQLDirective({
      name: 'sql',
      locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
      args: {
        table: { type: GraphQLString },
      },
      isRepeatable: true,
    });
    const transportDirective = new GraphQLDirective({
      name: 'transport',
      locations: [DirectiveLocation.SCHEMA],
      args: {
        kind: { type: GraphQLString },
        subgraph: { type: GraphQLString },
      },
    });
    const Query = new GraphQLObjectType({
      name: 'Query',
      fields: {
        albums: {
          type: GraphQLString,
          extensions: {
            directives: {
              sql: [{ table: 'albums' }],
            },
          },
        },
      },
    });
    let schema = new GraphQLSchema({
      query: Query,
      directives: [sqlDirective, transportDirective],
      extensions: {
        directives: {
          transport: [{ kind: 'sql', subgraph: 'chinook' }],
        },
      },
    });

    schema = ensureFederationReadySubgraph(schema);
    const dirs = getDirectiveExtensions(schema);
    expect(dirs?.link?.some((l: { url?: string }) => l.url?.includes('/mesh/spec/'))).toBe(true);
    const meshImport = dirs?.link?.find((l: { url?: string }) =>
      l.url?.startsWith('https://the-guild.dev/graphql/mesh/spec/'),
    );
    expect(meshImport?.import).toEqual(expect.arrayContaining(['@sql', '@transport']));
    expect(dirs?.composeDirective).toEqual(
      expect.arrayContaining([{ name: '@sql' }, { name: '@transport' }]),
    );
    expect(
      dirs?.link?.some(
        (l: { url?: string; import?: string[] }) =>
          l.url?.startsWith('https://specs.apollo.dev/federation/') &&
          l.import?.includes('@composeDirective'),
      ),
    ).toBe(true);

    // Idempotent
    const again = ensureFederationReadySubgraph(schema);
    expect(getDirectiveExtensions(again)?.composeDirective).toEqual(dirs?.composeDirective);
  });

  it('registers @composeDirective for @connect on Connectors subgraphs', () => {
    const schema = ensureFederationReadySubgraph(
      buildSchema(
        /* GraphQL */ `
          schema
            @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"]) {
            query: Query
          }
          directive @link(url: String!, import: [String]) repeatable on SCHEMA
          directive @connect(selection: String) on FIELD_DEFINITION
          directive @source(name: String) on SCHEMA
          type Query {
            hello: String @connect(selection: "hello")
          }
        `,
        { assumeValid: true, assumeValidSDL: true },
      ),
    );
    const dirs = getDirectiveExtensions(schema);
    expect(dirs?.composeDirective).toEqual(expect.arrayContaining([{ name: '@connect' }]));
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toContain('@composeDirective');
    expect(sdl).toContain('@connect');
  });
});
