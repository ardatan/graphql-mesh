import { buildSchema, OperationTypeNode, parse } from 'graphql';
import { normalizedExecutor } from '@graphql-tools/executor';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Response } from '@whatwg-node/fetch';
import { buildSelectionForType, resolveConnectSelectionLimit } from '../src/connectAnnotations.js';
import { clearMeshEntityRegistries, registerMeshEntityType } from '../src/entityRefs.js';
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

  it('resolveConnectSelectionLimit: defaults, 0 maxLength, -1 softDepth', () => {
    expect(resolveConnectSelectionLimit()).toEqual({
      maxLength: 12_000,
      softDepth: 2,
      overLimit: 'passthrough',
    });
    expect(
      resolveConnectSelectionLimit({ maxLength: 0, softDepth: -1, overLimit: 'leavesOnly' }),
    ).toMatchObject({
      maxLength: Number.POSITIVE_INFINITY,
      softDepth: Number.POSITIVE_INFINITY,
      overLimit: 'leavesOnly',
    });
  });

  it('connectSelection.overLimit passthrough emits $ when over maxLength', async () => {
    const deepSample: Record<string, unknown> = { id: '1', name: 'n' };
    // Enough nested object fields to exceed a tiny maxLength when expanded.
    for (let i = 0; i < 40; i++) {
      deepSample[`obj${i}`] = { a: 'x', b: 'y', c: 'z' };
    }
    const schema = await loadGraphQLSchemaFromJSONSchemas('big', {
      endpoint: 'http://localhost:3000',
      connectSelection: { maxLength: 80, overLimit: 'passthrough' },
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'thing',
          path: '/thing',
          method: 'GET',
          responseSample: deepSample,
        },
      ],
      async fetch() {
        return Response.json(deepSample);
      },
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toMatch(/thing[^\n]*selection: "\$"/);
  });

  it('connectSelection.overLimit leavesOnly keeps scalar leaves under maxLength', async () => {
    const deepSample: Record<string, unknown> = { id: '1', name: 'n' };
    for (let i = 0; i < 40; i++) {
      deepSample[`obj${i}`] = { a: 'x', b: 'y', c: 'z' };
    }
    const schema = await loadGraphQLSchemaFromJSONSchemas('big', {
      endpoint: 'http://localhost:3000',
      connectSelection: { maxLength: 80, overLimit: 'leavesOnly' },
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'thing',
          path: '/thing',
          method: 'GET',
          responseSample: deepSample,
        },
      ],
      async fetch() {
        return Response.json(deepSample);
      },
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toMatch(/thing[^\n]*selection: "/);
    expect(sdl).not.toMatch(/thing[^\n]*selection: "\$"/);
    expect(sdl).toMatch(/selection: "[^"]*\bid\b/);
  });

  it('infers entity stubs from parent FK when target type is resolvable', () => {
    clearMeshEntityRegistries();
    registerMeshEntityType('Supplier');
    const schema = buildSchema(/* GraphQL */ `
      type Supplier {
        id: ID
        name: String
      }
      type Product {
        id: ID
        name: String
        supplierId: Int
        supplier: Supplier
      }
    `);
    const selection = buildSelectionForType(schema.getType('Product') as any, {
      limit: resolveConnectSelectionLimit(),
    });
    expect(selection).toContain('supplier: { __typename: $("Supplier") id: supplierId }');
    expect(selection).not.toMatch(/supplier: \{[^}]*\bname\b/);
    expect(selection).toMatch(/\bid\b/);
    expect(selection).toMatch(/\bname\b/);
    clearMeshEntityRegistries();
  });
});
