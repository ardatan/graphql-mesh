import { buildSchema, OperationTypeNode, parse } from 'graphql';
import { processDirectives } from '@graphql-mesh/transport-rest';
import { normalizedExecutor } from '@graphql-tools/executor';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromJSONSchemas } from '../src/loadGraphQLSchemaFromJSONSchemas.js';

describe('queryParams QS bake (no @meshRestOptions)', () => {
  it('deepObject round-trips via queryParams / qs defaults without @meshRestOptions', async () => {
    const urls: string[] = [];
    const liveSchema = await loadGraphQLSchemaFromJSONSchemas('pets', {
      endpoint: 'http://localhost:3000',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'search',
          path: '/search',
          method: 'GET',
          queryParamArgMap: { created: 'created' },
          // Known props → baked as created[gt]/created[lt] on queryParams.
          // Unknown props would still stringify via qs deepObject defaults.
          queryStringOptionsByParam: {
            created: { destructObject: true, deepObject: true },
          },
          argTypeMap: {
            created: {
              type: 'object',
              properties: {
                gt: { type: 'integer' },
                lt: { type: 'integer' },
              },
            },
          },
          responseSample: [{ name: 'Bob' }],
        },
      ],
      async fetch() {
        return Response.json([{ name: 'Bob' }]);
      },
    });

    const sdl = printSchemaWithDirectives(liveSchema);
    expect(sdl).not.toContain('@meshRestOptions');
    expect(sdl).toContain('created[gt]');
    expect(sdl).toContain('created[lt]');

    const reloaded = processDirectives(
      buildSchema(sdl, { assumeValid: true, assumeValidSDL: true }),
      {
        globalFetch: (async (url: string) => {
          urls.push(String(url));
          return Response.json([{ name: 'Bob' }]);
        }) as any,
      },
    );

    const result = await normalizedExecutor({
      schema: reloaded,
      document: parse(/* GraphQL */ `
        query {
          search(created: { gt: 1, lt: 10 }) {
            name
          }
        }
      `),
    });
    expect(result).toMatchObject({
      data: { search: [{ name: 'Bob' }] },
    });
    expect(urls[0]).toContain('created%5Bgt%5D=1');
    expect(urls[0]).toContain('created%5Blt%5D=10');
  });

  it('serializes open deepObject objects via qs defaults without a directive', async () => {
    const urls: string[] = [];
    const liveSchema = await loadGraphQLSchemaFromJSONSchemas('pets', {
      endpoint: 'http://localhost:3000',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'search',
          path: '/search',
          method: 'GET',
          queryParamArgMap: { created: 'created' },
          // No properties → queryParams keeps `created: $args.created`; qs brackets.
          queryStringOptionsByParam: {
            created: { destructObject: true, deepObject: true },
          },
          argTypeMap: {
            created: {
              type: 'object',
            },
          },
          responseSample: [{ name: 'Bob' }],
        },
      ],
      async fetch() {
        return Response.json([{ name: 'Bob' }]);
      },
    });

    const sdl = printSchemaWithDirectives(liveSchema);
    expect(sdl).not.toContain('@meshRestOptions');
    expect(sdl).toContain('created: $args.created');

    const reloaded = processDirectives(
      buildSchema(sdl, { assumeValid: true, assumeValidSDL: true }),
      {
        globalFetch: (async (url: string) => {
          urls.push(String(url));
          return Response.json([{ name: 'Bob' }]);
        }) as any,
      },
    );

    await normalizedExecutor({
      schema: reloaded,
      document: parse(/* GraphQL */ `
        query {
          search(created: { gt: 1, lt: 10 }) {
            name
          }
        }
      `),
    });
    expect(urls[0]).toContain('created%5Bgt%5D=1');
    expect(urls[0]).toContain('created%5Blt%5D=10');
  });
});
