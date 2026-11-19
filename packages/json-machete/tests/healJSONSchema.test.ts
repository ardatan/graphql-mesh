import type { JSONSchema, JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { healJSONSchema } from '../src/healJSONSchema.js';

describe('healJSONSchema', () => {
  it('should add titles for non-primitive definitions if missing', async () => {
    const schema: JSONSchema = {
      type: 'object',
      title: 'SomeSchema',
      properties: {
        foo: {
          type: 'string',
          pattern: '^(\\([0-9]{3}\\))?[0-9]{3}-[0-9]{4}$',
        },
        bar: {
          type: 'object',
          properties: {
            qux: {
              type: 'number',
              format: 'int64',
            },
          },
        },
      },
    };
    const healedSchema = (await healJSONSchema(schema)) as JSONSchemaObject;
    expect(healedSchema.properties.bar.title).toBe('bar');
    expect(healedSchema.properties.foo.title).toBe('foo');
  });
  it('should add missing type: object if properties are in the definitions', async () => {
    const schema = {
      title: 'SomeSchema',
      properties: {
        foo: {
          type: 'string',
        },
      },
    };
    const healedSchema = (await healJSONSchema(schema)) as JSONSchemaObject;
    expect(healedSchema.type).toBe('object');
  });
  it('should add missing type: array if items are in the definitions', async () => {
    const schema = {
      title: 'SomeSchema',
      properties: {
        foo: {
          items: {
            type: 'string',
          },
        },
      },
    };
    const healedSchema = (await healJSONSchema(schema)) as JSONSchemaObject;
    expect(healedSchema.properties.foo.type).toBe('array');
  });
  it('should add missing properties if required is provided but no properties', async () => {
    const schema = {
      required: ['foo'],
    };
    const healedSchema = (await healJSONSchema(schema)) as JSONSchemaObject;
    expect(healedSchema.properties.foo).toBeDefined();
  });

  it('titles untitled enums under $resolvedRef from the definition name, not the operation path', async () => {
    // Mimic FHIR Duration cloned under two operation paths — same $resolvedRef.
    const durationProps = () => ({
      comparator: {
        description: 'How the value should be understood',
        type: 'string' as const,
        enum: ['<', '<=', '>=', '>'],
      },
    });
    const schema: JSONSchema = {
      type: 'object',
      title: 'Query',
      properties: {
        patient: {
          type: 'object',
          properties: {
            valueDuration: {
              type: 'object',
              title: 'Duration',
              $resolvedRef: '/definitions/Duration',
              properties: durationProps(),
            },
          },
        },
        observationById: {
          type: 'object',
          properties: {
            valueDuration: {
              type: 'object',
              title: 'Duration',
              $resolvedRef: '/definitions/Duration',
              properties: durationProps(),
            },
          },
        },
      },
    };
    const healed = (await healJSONSchema(schema)) as JSONSchemaObject;
    const patientCmp = (healed.properties.patient as JSONSchemaObject).properties
      .valueDuration as JSONSchemaObject;
    const obsCmp = (healed.properties.observationById as JSONSchemaObject).properties
      .valueDuration as JSONSchemaObject;
    expect((patientCmp.properties.comparator as JSONSchemaObject).title).toBe(
      'Duration_comparator',
    );
    expect((obsCmp.properties.comparator as JSONSchemaObject).title).toBe('Duration_comparator');
  });

  it('does not stamp stable titles on boolean+pattern props (FHIR deceasedBoolean)', async () => {
    // FHIR Patient.deceasedBoolean has type boolean + pattern '^true|false$'.
    // A stable title would skip boolean cleanup and yield a regexp scalar.
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        patient: {
          type: 'object',
          properties: {
            resource: {
              type: 'object',
              title: 'Patient',
              $resolvedRef: '/definitions/Patient',
              properties: {
                deceasedBoolean: {
                  description: 'Indicates if the individual is deceased or not.',
                  pattern: '^true|false$',
                  type: 'boolean',
                },
                gender: {
                  type: 'string',
                  enum: ['male', 'female', 'other', 'unknown'],
                },
              },
            },
          },
        },
      },
    };
    const healed = (await healJSONSchema(schema)) as JSONSchemaObject;
    const patient = (
      (healed.properties.patient as JSONSchemaObject).properties.resource as JSONSchemaObject
    ).properties;
    const deceased = patient.deceasedBoolean as JSONSchemaObject;
    expect(deceased.title).toBeUndefined();
    expect(deceased.pattern).toBeUndefined();
    expect(deceased.type).toBe('boolean');
    expect((patient.gender as JSONSchemaObject).title).toBe('Patient_gender');
  });

  it('titles untitled array-item enums under $resolvedRef from the definition name', async () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        patient: {
          type: 'object',
          properties: {
            repeat: {
              type: 'object',
              title: 'Timing_Repeat',
              $resolvedRef: '/definitions/Timing_Repeat',
              properties: {
                when: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['MORN', 'AFT'],
                  },
                },
              },
            },
          },
        },
      },
    };
    const healed = (await healJSONSchema(schema)) as JSONSchemaObject;
    const when = (
      (healed.properties.patient as JSONSchemaObject).properties.repeat as JSONSchemaObject
    ).properties.when as JSONSchemaObject;
    expect((when.items as JSONSchemaObject).title).toBe('Timing_Repeat_when_items');
  });
});
