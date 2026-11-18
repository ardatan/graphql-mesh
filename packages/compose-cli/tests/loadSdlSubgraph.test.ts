/* eslint-disable import/no-nodejs-modules */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDirectiveExtensions, printSchemaWithDirectives } from '@graphql-tools/utils';
import { dummyLogger as log } from '../../testing/dummyLogger';
import { loadSdlSubgraph } from '../src/loadSdlSubgraph.js';

describe('loadSdlSubgraph', () => {
  it('loads inline typeDefs and makes Mesh directives federation-ready', async () => {
    const handler = loadSdlSubgraph('shop', {
      typeDefs: /* GraphQL */ `
        directive @sql(table: String) repeatable on FIELD_DEFINITION
        directive @transport(kind: String, subgraph: String, location: String) on SCHEMA
        type Query {
          albums: String @sql(table: "albums")
        }
      `,
      transport: {
        kind: 'sql',
        location: 'file:chinook.db',
      },
    });
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
    expect(sdl).toContain('https://the-guild.dev/graphql/mesh/spec/');
    expect(sdl).toContain('@composeDirective');
  });

  it('loads SDL from a file path', async () => {
    const dir = join(tmpdir(), `mesh-load-sdl-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'movies.graphql');
    writeFileSync(
      file,
      /* GraphQL */ `
        directive @protobuf__rpc(method: String) on FIELD_DEFINITION
        type Query {
          movies: String @protobuf__rpc(method: "List")
        }
      `,
      'utf8',
    );
    const { schema$ } = loadSdlSubgraph('movies', {
      source: file,
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

  it('skips federationReady when federationReady: false', async () => {
    const { schema$ } = loadSdlSubgraph('shop', {
      federationReady: false,
      typeDefs: /* GraphQL */ `
        directive @sql(table: String) on FIELD_DEFINITION
        type Query {
          albums: String @sql(table: "albums")
        }
      `,
    })({
      cwd: process.cwd(),
      fetch: globalThis.fetch,
      log,
    });
    const schema = await schema$;
    const dirs = getDirectiveExtensions(schema);
    expect(dirs?.composeDirective).toBeUndefined();
  });
});
