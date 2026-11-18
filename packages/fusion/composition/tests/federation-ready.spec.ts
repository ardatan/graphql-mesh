import {
  buildSchema,
  DirectiveLocation,
  GraphQLDirective,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import {
  addConnectComposeDirective,
  assertSupportedMeshSpec,
  importMeshDirectives,
  MESH_GATEWAY_SOURCE_SPEC_URL,
  MESH_SUPPORTED_SPEC_VERSIONS,
  meshSpecUrl,
  parseMeshSpecUrl,
} from '@graphql-mesh/utils';
import { getDirectiveExtensions, printSchemaWithDirectives } from '@graphql-tools/utils';

describe('importMeshDirectives / addConnectComposeDirective', () => {
  it('meshSpecUrl trims slashes without regex ReDoS shape', () => {
    expect(meshSpecUrl('///thrift///')).toBe('https://specs.graphql-mesh.com/thrift/v0.1');
    expect(meshSpecUrl('/sql/', '0.1')).toBe('https://specs.graphql-mesh.com/sql/v0.1');
    // Long `/` prefix must stay linear-time (CodeQL: no `/^\/+|\/+$/`).
    const many = '/'.repeat(10_000) + 'mongo' + '/'.repeat(10_000);
    expect(meshSpecUrl(many)).toBe('https://specs.graphql-mesh.com/mongo/v0.1');
  });

  it('parseMeshSpecUrl + assertSupportedMeshSpec enforce the Mesh spec contract', () => {
    expect(parseMeshSpecUrl(meshSpecUrl('sql'))).toEqual({
      name: 'sql',
      version: 'v0.1',
      url: meshSpecUrl('sql'),
      legacy: false,
    });
    expect(parseMeshSpecUrl(MESH_GATEWAY_SOURCE_SPEC_URL)).toMatchObject({
      name: 'core',
      version: 'v1.0',
      legacy: true,
    });
    expect(() =>
      assertSupportedMeshSpec({
        name: 'sql',
        supportedVersions: MESH_SUPPORTED_SPEC_VERSIONS,
        links: [{ url: meshSpecUrl('sql', 'v9.9'), import: ['@sql'] }],
        required: true,
        consumer: 'test',
      }),
    ).toThrow(/unsupported Mesh spec "sql"/);
    expect(
      assertSupportedMeshSpec({
        name: 'core',
        supportedVersions: MESH_SUPPORTED_SPEC_VERSIONS,
        links: [{ url: MESH_GATEWAY_SOURCE_SPEC_URL, import: ['@source'] }],
        required: true,
        acceptLegacyCore: true,
      })?.legacy,
    ).toBe(true);
  });

  it('imports explicit Mesh directives with @composeDirective and Mesh @link', () => {
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

    schema = importMeshDirectives(
      importMeshDirectives(schema, ['@sql'], { url: meshSpecUrl('sql') }),
      ['@transport'],
    );
    const dirs = getDirectiveExtensions(schema);
    expect(
      dirs?.link?.some((l: { url?: string }) => l.url === meshSpecUrl('sql')),
    ).toBe(true);
    expect(
      dirs?.link?.some((l: { url?: string }) => l.url === meshSpecUrl('core')),
    ).toBe(true);
    const sqlImport = dirs?.link?.find((l: { url?: string }) => l.url === meshSpecUrl('sql'));
    const coreImport = dirs?.link?.find((l: { url?: string }) => l.url === meshSpecUrl('core'));
    expect(sqlImport?.import).toEqual(expect.arrayContaining(['@sql']));
    expect(coreImport?.import).toEqual(expect.arrayContaining(['@transport']));
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
    const again = importMeshDirectives(
      importMeshDirectives(schema, ['@sql'], { url: meshSpecUrl('sql') }),
      ['@transport'],
    );
    expect(getDirectiveExtensions(again)?.composeDirective).toEqual(dirs?.composeDirective);
  });

  it('registers @composeDirective for @connect on Connectors subgraphs', () => {
    const schema = addConnectComposeDirective(
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
