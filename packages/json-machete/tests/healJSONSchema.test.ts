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
    // Mimic FHIR Duration cloned under two operation paths - same $resolvedRef.
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

  it('prefers shared FHIR primitive titles over Parent_property (Extension value*, status, id)', async () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        extension: {
          type: 'object',
          title: 'Extension',
          $resolvedRef: '/definitions/Extension',
          properties: {
            valueBase64Binary: {
              pattern: '^(\\s*([0-9a-zA-Z\\+/=]){4}\\s*)+$',
              type: 'string',
            },
            valueCanonical: {
              pattern: '^\\S*$',
              type: 'string',
            },
            valueCode: {
              pattern: '^[^\\s]+(\\s[^\\s]+)*$',
              type: 'string',
            },
          },
        },
        activity: {
          type: 'object',
          title: 'ActivityDefinition',
          $resolvedRef: '/definitions/ActivityDefinition',
          properties: {
            status: {
              type: 'string',
              enum: ['draft', 'active', 'retired', 'unknown'],
            },
            resourceType: {
              description: 'This is a ActivityDefinition resource',
              const: 'ActivityDefinition',
            },
            id: {
              pattern: '^[A-Za-z0-9\\-\\.]{1,64}$',
              type: 'string',
              $resolvedRef: '/definitions/id',
            },
          },
        },
      },
    };
    const healed = (await healJSONSchema(schema)) as JSONSchemaObject;
    const ext = (healed.properties.extension as JSONSchemaObject).properties;
    expect((ext.valueBase64Binary as JSONSchemaObject).title).toBe('base64Binary');
    expect((ext.valueCanonical as JSONSchemaObject).title).toBe('canonical');
    expect((ext.valueCode as JSONSchemaObject).title).toBe('code');
    const activity = (healed.properties.activity as JSONSchemaObject).properties;
    const status = activity.status as JSONSchemaObject;
    expect(status.title).toBe('code');
    expect(status.enum).toBeUndefined();
    expect(status.pattern).toBe('^[^\\s]+(\\s[^\\s]+)*$');
    const resourceType = activity.resourceType as JSONSchemaObject;
    expect(resourceType.title).toBeUndefined();
    expect(resourceType.const).toBeUndefined();
    expect(resourceType.enum).toBeUndefined();
    expect(resourceType.type).toBe('string');
    expect((activity.id as JSONSchemaObject).title).toBe('id');
  });

  it('does not collapse OpenAPI id/date/code onto FHIR titles (keeps format)', async () => {
    // Bare prop names must not trigger shared FHIR titles - otherwise
    // `format: uuid` becomes plain `id` String and Language `code` enums collapse.
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        company: {
          type: 'object',
          title: 'company',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            date: {
              type: 'string',
              format: 'date',
            },
            code: {
              type: 'string',
              enum: ['aa', 'ab', 'en'],
            },
          },
        },
      },
    };
    const healed = (await healJSONSchema(schema)) as JSONSchemaObject;
    const company = (healed.properties.company as JSONSchemaObject).properties;
    const id = company.id as JSONSchemaObject;
    expect(id.format).toBe('uuid');
    expect(id.title).not.toBe('id');
    const date = company.date as JSONSchemaObject;
    expect(date.format).toBe('date');
    expect(date.title).not.toBe('date');
    const code = company.code as JSONSchemaObject;
    expect(code.enum).toEqual(['aa', 'ab', 'en']);
    expect(code.title).not.toBe('code');
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

  it('guards resolveItemsType against cyclic allOf/anyOf/oneOf wrappers', async () => {
    const cyclicItems: Record<string, unknown> = {};
    cyclicItems.allOf = [cyclicItems];
    const schema: JSONSchemaObject = {
      type: 'object',
      title: 'CyclicItems',
      properties: {
        flags: {
          type: 'array',
          items: cyclicItems,
          default: 'false',
        },
      },
    };
    const healed = (await healJSONSchema(schema)) as JSONSchemaObject;
    // Cycle → no resolvable item type → leave the string default intact (no JSON.parse).
    expect((healed.properties.flags as JSONSchemaObject).default).toBe('false');
  });

  it('keeps bare scalar string defaults on array schemas as singleton items', async () => {
    // OpenAPI often sets `default: "200"` on `type: array` to mean `["200"]`.
    // `JSON.parse("200")` must not turn that into the number 200.
    const schema: JSONSchemaObject = {
      type: 'object',
      title: 'HttpConfig',
      properties: {
        expected_codes: {
          type: 'array',
          items: { type: 'string' },
          default: '200',
        },
        encoded: {
          type: 'array',
          items: { type: 'string' },
          default: '["200","201"]',
        },
        flags: {
          type: 'array',
          items: { type: 'boolean' },
          default: 'false',
        },
      },
    };
    const healed = (await healJSONSchema(schema)) as JSONSchemaObject;
    expect((healed.properties.expected_codes as JSONSchemaObject).default).toBe('200');
    expect((healed.properties.encoded as JSONSchemaObject).default).toEqual(['200', '201']);
    expect((healed.properties.flags as JSONSchemaObject).default).toBe(false);
  });
});
