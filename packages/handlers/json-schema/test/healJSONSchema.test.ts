import { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { healJSONSchema } from '../src/utils/healJSONSchema';

describe('healJSONSchema', () => {
  it('should add titles for non-primitive definitions if missing', async () => {
    const schema = {
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
    expect(healedSchema.properties.bar.title).toBe('_bar');
    expect(healedSchema.properties.foo.title).toBe('_foo');
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
});
