import { compareJSONSchemas } from '../src/compareJSONSchemas';

describe('compareJSONSchemas', () => {
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
      await compareJSONSchemas(oldSchema, newSchema);
      expect(true).toBe(false);
    } catch (e) {
      console.log(e);
      expect(e.errors).toBeDefined();
      const errors = [...e.errors];
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe(`/properties/bar/type is changed from string to undefined`);
      expect(errors[1].message).toBe(`/properties doesn't have bar`);
    }
  });
});
