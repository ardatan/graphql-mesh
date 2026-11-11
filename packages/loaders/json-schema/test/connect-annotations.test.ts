import { OperationTypeNode, parse } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromJSONSchemas } from '../src/loadGraphQLSchemaFromJSONSchemas.js';

describe('Federation Connectors annotations', () => {
  it('emits @source and @connect instead of @httpOperation/@transport', async () => {
    const schema = await loadGraphQLSchemaFromJSONSchemas('pets', {
      endpoint: 'http://localhost:3000',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'pet',
          path: '/pets/{args.id}',
          method: 'GET',
          responseSample: {
            id: '1',
            name: 'Dune',
          },
        },
      ],
      async fetch(url) {
        expect(url).toBe('http://localhost:3000/pets/1');
        return Response.json({ id: '1', name: 'Dune' });
      },
    });

    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toContain('@source');
    expect(sdl).toContain('@connect');
    expect(sdl).toContain('https://specs.apollo.dev/connect/v0.4');
    expect(sdl).not.toContain('@httpOperation');
    expect(sdl).not.toContain('kind: "rest"');
    expect(sdl).not.toContain('@transport');

    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          pet(id: "1") {
            id
            name
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        pet: {
          id: '1',
          name: 'Dune',
        },
      },
    });
  });

  it('maps queryParams from queryParamArgMap', async () => {
    const schema = await loadGraphQLSchemaFromJSONSchemas('pets', {
      endpoint: 'http://localhost:3000',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'pets',
          path: '/pets',
          method: 'GET',
          queryParamArgMap: {
            limit: 'limit',
          },
          argTypeMap: {
            limit: {
              type: 'integer',
            },
          },
          responseSample: [{ id: '1' }],
        },
      ],
      async fetch(url) {
        expect(url).toBe('http://localhost:3000/pets?limit=10');
        return Response.json([{ id: '1' }]);
      },
    });

    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toContain('queryParams:');
    expect(sdl).toContain('limit: $args.limit');
    expect(sdl).toContain('{');

    const result = await normalizedExecutor({
      schema,
      document: parse(/* GraphQL */ `
        query {
          pets(limit: 10) {
            id
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        pets: [{ id: '1' }],
      },
    });
  });
});
