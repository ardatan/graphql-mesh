/* eslint-disable import/no-nodejs-modules */
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDirectiveExtensions, printSchemaWithDirectives } from '@graphql-tools/utils';
import { dummyLogger as log } from '../../testing/dummyLogger';
import { getComposedResultFromConfig } from '../src/getComposedSchemaFromConfig.js';
import { resolveSubgraphName, resolveSubgraphSchema } from '../src/resolveSubgraphSchema.js';

describe('subgraphs[].schema config', () => {
  it('loads inline SDL that already carries Mesh @link / @composeDirective', async () => {
    const { schema } = await resolveSubgraphSchema(
      { cwd: process.cwd(), fetch: globalThis.fetch, log },
      {
        subgraphName: 'shop',
        schema: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.graphql-mesh.dev/sql/v0.1", import: ["@sql"])
            @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])
            @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@composeDirective"])
            @composeDirective(name: "@sql")
            @composeDirective(name: "@transport")

          directive @link(url: String!, import: [String]) repeatable on SCHEMA
          directive @composeDirective(name: String!) repeatable on SCHEMA
          directive @sql(table: String) repeatable on FIELD_DEFINITION
          type Query {
            albums: String @sql(table: "albums")
          }
        `,
        transport: { kind: 'sql', location: 'file:chinook.db' },
      },
    );
    const dirs = getDirectiveExtensions(schema);
    expect(dirs?.composeDirective).toEqual(
      expect.arrayContaining([{ name: '@sql' }, { name: '@transport' }]),
    );
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toContain('https://specs.graphql-mesh.dev/');
    expect(sdl).toContain('@composeDirective');
  });

  it('merges transport option fields onto an existing @transport', async () => {
    const { name, schema } = await resolveSubgraphSchema(
      { cwd: process.cwd(), fetch: globalThis.fetch, log },
      {
        schema: /* GraphQL */ `
          extend schema @transport(subgraph: "shop", kind: "sql", location: "file:old.db")

          directive @transport(
            subgraph: String!
            kind: String!
            location: String
            options: String
          ) repeatable on SCHEMA
          type Query {
            albums: String
          }
        `,
        transport: {
          location: 'file:chinook.db',
          options: { readonly: true },
        },
      },
    );
    expect(name).toBe('shop');
    const dirs = getDirectiveExtensions(schema);
    expect(dirs?.transport?.[0] || dirs?.transport).toMatchObject({
      subgraph: 'shop',
      kind: 'sql',
      location: 'file:chinook.db',
      options: { readonly: true },
    });
  });

  it('takes subgraph name from @transport when config name is omitted', async () => {
    const { name } = await resolveSubgraphSchema(
      { cwd: process.cwd(), fetch: globalThis.fetch, log },
      {
        schema: /* GraphQL */ `
          extend schema @transport(subgraph: "from-transport", kind: "sql")
          directive @transport(subgraph: String!, kind: String!) repeatable on SCHEMA
          type Query {
            hello: String
          }
        `,
      },
    );
    expect(name).toBe('from-transport');
  });

  it('throws when config name conflicts with @transport(subgraph:)', () => {
    expect(() =>
      resolveSubgraphSchema(
        { cwd: process.cwd(), fetch: globalThis.fetch, log },
        {
          subgraphName: 'config-name',
          schema: /* GraphQL */ `
            extend schema @transport(subgraph: "transport-name", kind: "sql")
            directive @transport(subgraph: String!, kind: String!) repeatable on SCHEMA
            type Query {
              hello: String
            }
          `,
        },
      ),
    ).toThrow(/Subgraph name conflict/);
  });

  it('throws when neither config name nor @transport(subgraph:) is set', () => {
    expect(() =>
      resolveSubgraphSchema(
        { cwd: process.cwd(), fetch: globalThis.fetch, log },
        {
          schema: /* GraphQL */ `
            type Query {
              hello: String
            }
          `,
        },
      ),
    ).toThrow(/Subgraph name is required/);
  });

  it('resolveSubgraphName mirrors conflict / missing rules', async () => {
    const { schema } = await resolveSubgraphSchema(
      { cwd: process.cwd(), fetch: globalThis.fetch, log },
      {
        subgraphName: 'shop',
        schema: /* GraphQL */ `
          extend schema @transport(subgraph: "shop", kind: "sql")
          directive @transport(subgraph: String!, kind: String!) repeatable on SCHEMA
          type Query {
            hello: String
          }
        `,
      },
    );
    expect(resolveSubgraphName(schema, 'shop')).toBe('shop');
    expect(() => resolveSubgraphName(schema, 'other')).toThrow(/conflict/i);
  });

  it('composes a subgraph supplied via name + schema', async () => {
    const dir = join(tmpdir(), `mesh-schema-config-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'hello.graphql');
    writeFileSync(
      file,
      /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      'utf8',
    );
    const { supergraphSdl } = await getComposedResultFromConfig(
      {
        subgraphs: [
          {
            name: 'hello',
            schema: file,
          },
        ],
      },
      log,
    );
    expect(supergraphSdl).toContain('hello');
    expect(supergraphSdl).toContain('type Query');
  });

  it('routingUrl writes @join__graph(url:) and keeps @transport(location:) upstream', async () => {
    const { supergraphSdl } = await getComposedResultFromConfig(
      {
        subgraphs: [
          {
            name: 'users',
            routingUrl: 'http://router-facing:4001/graphql',
            schema: /* GraphQL */ `
              extend schema
                @transport(
                  subgraph: "users"
                  kind: "http"
                  location: "http://upstream:8080/graphql"
                )

              directive @transport(
                subgraph: String!
                kind: String!
                location: String
              ) repeatable on SCHEMA

              type Query {
                me: String
              }
            `,
          },
        ],
      },
      log,
    );
    expect(supergraphSdl).toMatch(
      /@join__graph\(name:\s*"users",\s*url:\s*"http:\/\/router-facing:4001\/graphql"\)/,
    );
    expect(supergraphSdl).toMatch(/location:\s*"http:\/\/upstream:8080\/graphql"/);
    expect(supergraphSdl).not.toMatch(
      /@join__graph\(name:\s*"users",\s*url:\s*"http:\/\/upstream:8080\/graphql"\)/,
    );
  });
});
