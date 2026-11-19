import { OperationTypeNode, printType } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadNonExecutableGraphQLSchemaFromJSONSchemas } from '../src/loadGraphQLSchemaFromJSONSchemas.js';
import { parseSelectionFieldTree } from '../src/pruneJsonSchemaBySelection.js';

describe('selection-driven schemaFields emit', () => {
  it('parseSelectionFieldTree builds nested name trees', () => {
    const tree = parseSelectionFieldTree(`
      id
      gender
      name {
        family
        given
      }
    `);
    expect(tree).not.toBeNull();
    expect([...tree!.keys()].sort()).toEqual(['gender', 'id', 'name']);
    expect(tree!.get('id')).toBeNull();
    const name = tree!.get('name');
    expect(name).toBeInstanceOf(Map);
    expect([...(name as Map<string, unknown>).keys()].sort()).toEqual(['family', 'given']);
  });

  it('returns null for $ / expression-only selections', () => {
    expect(parseSelectionFieldTree('$')).toBeNull();
    expect(parseSelectionFieldTree('$root')).toBeNull();
    expect(parseSelectionFieldTree('')).toBeNull();
  });

  function createPatientSchema() {
    return {
      type: 'object',
      title: 'Patient',
      properties: {
        id: { type: 'string', title: 'id' },
        gender: { type: 'string', title: 'code' },
        extension: {
          type: 'array',
          items: {
            type: 'object',
            title: 'Extension',
            properties: {
              url: { type: 'string' },
              valueString: { type: 'string' },
            },
          },
        },
        meta: {
          type: 'object',
          title: 'Meta',
          properties: {
            versionId: { type: 'string' },
          },
        },
        name: {
          type: 'array',
          items: {
            type: 'object',
            title: 'HumanName',
            properties: {
              family: { type: 'string' },
              given: { type: 'array', items: { type: 'string' } },
              text: { type: 'string' },
              period: {
                type: 'object',
                title: 'Period',
                properties: {
                  start: { type: 'string' },
                  end: { type: 'string' },
                },
              },
            },
          },
        },
      },
    };
  }

  it('prunes GraphQL emit to selection by default (no Extension/Meta/Period)', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromJSONSchemas('patients', {
      endpoint: 'http://localhost',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'patient',
          path: '/Patient/{args.id}',
          method: 'GET',
          responseSchema: createPatientSchema() as any,
          selection: `
            id
            gender
            name {
              family
              given
            }
          `,
        },
      ],
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toContain('type Patient');
    expect(sdl).toContain('type HumanName');
    expect(sdl).not.toContain('type Extension');
    expect(sdl).not.toContain('type Meta');
    expect(sdl).not.toContain('type Period');
    const patient = schema.getType('Patient');
    expect(patient && 'getFields' in patient ? Object.keys(patient.getFields()).sort() : []).toEqual(
      ['gender', 'id', 'name'],
    );
    const humanName = schema.getType('HumanName');
    expect(
      humanName && 'getFields' in humanName ? Object.keys(humanName.getFields()).sort() : [],
    ).toEqual(['family', 'given']);
  });

  it('schemaFields: all keeps full surface despite selection', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromJSONSchemas('patients', {
      endpoint: 'http://localhost',
      schemaFields: 'all',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'patient',
          path: '/Patient/{args.id}',
          method: 'GET',
          responseSchema: createPatientSchema() as any,
          selection: `
            id
            gender
            name {
              family
              given
            }
          `,
        },
      ],
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toContain('type Extension');
    expect(sdl).toContain('type Meta');
    expect(sdl).toContain('type Period');
    const patient = schema.getType('Patient');
    expect(patient && 'getFields' in patient ? Object.keys(patient.getFields()).sort() : []).toEqual(
      ['extension', 'gender', 'id', 'meta', 'name'],
    );
  });

  it('omits prune when selection is absent', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromJSONSchemas('patients', {
      endpoint: 'http://localhost',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'patient',
          path: '/Patient/{args.id}',
          method: 'GET',
          responseSchema: createPatientSchema() as any,
        },
      ],
    });
    expect(printType(schema.getType('Extension')!)).toContain('url');
    expect(schema.getType('Meta')).toBeDefined();
  });
});
