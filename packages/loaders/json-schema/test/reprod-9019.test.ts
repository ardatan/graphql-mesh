import { OperationTypeNode } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromJSONSchemas } from '../src/loadGraphQLSchemaFromJSONSchemas.js';

describe('Reproduction #9019', () => {
  it('reuses a shared $ref type reached via different relative paths', async () => {
    const schema = await loadGraphQLSchemaFromJSONSchemas('SuluRest', {
      endpoint: 'http://localhost',
      cwd: __dirname,
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'ambassadorList',
          method: 'GET',
          path: '/ambassadors.json',
          responseSchema: './fixtures/reprod-9019/ambassador.json#/definitions/AmbassadorList',
        },
      ],
    });

    const typeMap = schema.getTypeMap();
    expect(typeMap.SingleMediaSelection).toBeDefined();
    expect(typeMap.SingleMediaSelection2).toBeUndefined();
    expect(typeMap.SingleMediaSelection3).toBeUndefined();

    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).not.toMatch(/SingleMediaSelection\d/);
  });
});
