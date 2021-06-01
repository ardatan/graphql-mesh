import { JsonSchemaWithDiff } from '../src/JsonSchemaWithDiff';

describe('validateSchemaCompatibility', () => {
  it('should throw on removed field', async () => {
    const oldSchema = {
      type: 'object',
      title: 'Foo',
      properties: {
        id: {
          type: 'string',
        },
        bar: {
          type: 'string',
        },
      },
    };

    const newSchema = {
      type: 'object',
      title: 'Foo',
      properties: {
        id: {
          type: 'string',
        },
      },
    };

    try {
      await JsonSchemaWithDiff.validate(oldSchema, newSchema, '');
      expect(true).toBe(false);
    } catch (e) {
      const errors = [...e];
      expect(errors[0].message).toBe(`/properties doesn't have bar`);
      expect(errors[1].message).toBe(`/properties/bar/type is changed from string to undefined`);
    }
  });
});
