import { buildSchema, OperationTypeNode, parse } from 'graphql';
import { processDirectives } from '@graphql-mesh/transport-rest';
import { normalizedExecutor } from '@graphql-tools/executor';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromJSONSchemas } from '../src/loadGraphQLSchemaFromJSONSchemas.js';

describe('@meshRestOptions SDL round-trip', () => {
  it('survives printSchemaWithDirectives → buildSchema → processDirectives', async () => {
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
          // No known properties → emit keeps `created: $args.created`; runtime needs
          // `@meshRestOptions(deepObject/destructObject)` after SDL reload.
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
    expect(sdl).toContain('@meshRestOptions');
    expect(sdl).toContain('deepObject');

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
    // deepObject must still apply after SDL round-trip (not only in-memory extensions).
    expect(urls[0]).toContain('created%5Bgt%5D=1');
    expect(urls[0]).toContain('created%5Blt%5D=10');
  });
});
