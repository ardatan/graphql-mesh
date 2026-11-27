/* eslint-disable import/no-nodejs-modules */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDirectiveExtensions, printSchemaWithDirectives } from '@graphql-tools/utils';
import { dummyLogger as log } from '../../testing/dummyLogger';
import { loadSubgraphFromSDL } from '../src/loadSubgraphFromSDL.js';

describe('loadSubgraphFromSDL', () => {
  it('loads inline SDL and stamps optional @transport', async () => {
    const handler = loadSubgraphFromSDL(
      'shop',
      /* GraphQL */ `
        extend schema
          @link(url: "https://specs.graphql-mesh.dev/sql/v0.1", import: ["@sql"])
          @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])
          @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@composeDirective"])
          @composeDirective(name: "@sql")
          @composeDirective(name: "@transport")

        directive @link(url: String!, import: [String]) repeatable on SCHEMA
        directive @composeDirective(name: String!) repeatable on SCHEMA
        directive @sql(table: String) repeatable on FIELD_DEFINITION
        directive @transport(kind: String, subgraph: String, location: String) on SCHEMA
        type Query {
          albums: String @sql(table: "albums")
        }
      `,
      {
        transport: {
          kind: 'sql',
          location: 'file:chinook.db',
        },
      },
    );
    const { name, schema$ } = handler({
      cwd: process.cwd(),
      fetch: globalThis.fetch,
      log,
    });
    expect(name).toBe('shop');
    const schema = await schema$;
    const dirs = getDirectiveExtensions(schema);
    expect(dirs?.transport?.[0] || dirs?.transport).toMatchObject({
      kind: 'sql',
      location: 'file:chinook.db',
    });
    expect(dirs?.composeDirective).toEqual(
      expect.arrayContaining([{ name: '@sql' }, { name: '@transport' }]),
    );
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toContain('https://specs.graphql-mesh.dev/');
    expect(sdl).toContain('@composeDirective');
  });

  it('loads SDL from a file path and accepts Promise schema input', async () => {
    const dir = join(tmpdir(), `mesh-load-sdl-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'movies.graphql');
    writeFileSync(
      file,
      /* GraphQL */ `
        extend schema
          @link(url: "https://specs.graphql-mesh.dev/protobuf/v0.1", import: ["@protobuf__rpc"])
          @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])
          @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@composeDirective"])
          @composeDirective(name: "@protobuf__rpc")
          @composeDirective(name: "@transport")

        directive @link(url: String!, import: [String]) repeatable on SCHEMA
        directive @composeDirective(name: String!) repeatable on SCHEMA
        directive @protobuf__rpc(method: String!) on FIELD_DEFINITION
        type Query {
          movies: String @protobuf__rpc(method: "List")
        }
      `,
      'utf8',
    );
    const { schema$ } = loadSubgraphFromSDL('movies', Promise.resolve(file), {
      transport: { kind: 'protobuf', location: 'http://localhost:50051' },
    })({
      cwd: dir,
      fetch: globalThis.fetch,
      log,
    });
    const schema = await schema$;
    const dirs = getDirectiveExtensions(schema);
    expect(dirs?.composeDirective).toEqual(
      expect.arrayContaining([{ name: '@protobuf__rpc' }, { name: '@transport' }]),
    );
  });

  it('does not stamp @composeDirective(name: "@connect") (Apollo Connectors alignment)', async () => {
    const { schema$ } = loadSubgraphFromSDL(
      'shop',
      /* GraphQL */ `
        schema
          @link(url: "https://specs.apollo.dev/connect/v0.4", import: ["@connect", "@source"])
          @source(name: "rest", http: { baseURL: "https://api.example.com" }) {
          query: Query
        }
        directive @link(url: String!, import: [String]) repeatable on SCHEMA
        directive @connect(selection: String) on FIELD_DEFINITION
        directive @source(name: String!, http: SourceHTTP!) repeatable on SCHEMA
        input SourceHTTP {
          baseURL: String!
        }
        type Query {
          hello: String @connect(selection: "hello")
        }
      `,
    )({
      cwd: process.cwd(),
      fetch: globalThis.fetch,
      log,
    });
    const schema = await schema$;
    const dirs = getDirectiveExtensions(schema);
    expect(
      dirs?.composeDirective?.some((d: { name?: string }) => d.name === '@connect'),
    ).toBeFalsy();
  });
});
