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
    } as const;

    const newSchema = {
      type: 'object',
      title: 'Foo',
      properties: {
        id: {
          type: 'string',
        },
      },
    } as const;

    try {
      await JsonSchemaWithDiff.validate(oldSchema, newSchema, '');
      expect(true).toBe(false);
    } catch (e) {
      const errors = [...e.errors];
      expect(errors[0].message).toBe(`/properties doesn't have bar`);
      expect(errors[1].message).toBe(`/properties/bar/type is changed from string to undefined`);
    }
  });
});
