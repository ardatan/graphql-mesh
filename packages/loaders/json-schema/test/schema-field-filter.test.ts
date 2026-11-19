import { OperationTypeNode, printType } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadNonExecutableGraphQLSchemaFromJSONSchemas } from '../src/loadGraphQLSchemaFromJSONSchemas.js';

describe('explicit include/exclude schema field filter', () => {
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

  it('include whitelists fields; selection alone does not prune emit', async () => {
    const withInclude = await loadNonExecutableGraphQLSchemaFromJSONSchemas('patients', {
      endpoint: 'http://localhost',
      include: {
        Patient: ['id', 'gender', 'name'],
        HumanName: ['family', 'given'],
      },
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
    const sdl = printSchemaWithDirectives(withInclude);
    expect(sdl).not.toContain('type Extension');
    expect(sdl).not.toContain('type Meta');
    expect(sdl).not.toContain('type Period');
    const patient = withInclude.getType('Patient');
    expect(
      patient && 'getFields' in patient ? Object.keys(patient.getFields()).sort() : [],
    ).toEqual(['gender', 'id', 'name']);

    // selection without include/exclude → full emit
    const selectionOnly = await loadNonExecutableGraphQLSchemaFromJSONSchemas('patients', {
      endpoint: 'http://localhost',
      operations: [
        {
          type: OperationTypeNode.QUERY,
          field: 'patient',
          path: '/Patient/{args.id}',
          method: 'GET',
          responseSchema: createPatientSchema() as any,
          selection: `id gender`,
        },
      ],
    });
    expect(printSchemaWithDirectives(selectionOnly)).toContain('type Extension');
    expect(selectionOnly.getType('Meta')).toBeDefined();
  });

  it('exclude blacklists fields', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromJSONSchemas('patients', {
      endpoint: 'http://localhost',
      exclude: {
        Patient: ['extension', 'meta'],
        HumanName: ['text', 'period'],
      },
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
    expect(printSchemaWithDirectives(schema)).not.toContain('type Extension');
    expect(schema.getType('Meta')).toBeUndefined();
    expect(schema.getType('Period')).toBeUndefined();
    const patient = schema.getType('Patient');
    expect(
      patient && 'getFields' in patient ? Object.keys(patient.getFields()).sort() : [],
    ).toEqual(['gender', 'id', 'name']);
    expect(printType(schema.getType('HumanName')!)).toContain('family');
    expect(printType(schema.getType('HumanName')!)).not.toContain('period');
  });

  it('include wins over exclude for the same type', async () => {
    const schema = await loadNonExecutableGraphQLSchemaFromJSONSchemas('patients', {
      endpoint: 'http://localhost',
      include: { Patient: ['id', 'name'] },
      exclude: { Patient: ['id'] },
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
    const patient = schema.getType('Patient');
    expect(
      patient && 'getFields' in patient ? Object.keys(patient.getFields()).sort() : [],
    ).toEqual(['id', 'name']);
  });
});
