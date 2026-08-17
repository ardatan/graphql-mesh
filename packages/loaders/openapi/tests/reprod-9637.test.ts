import { assertObjectType, getNamedType, printSchema } from 'graphql';
import loadGraphQLSchemaFromOpenAPI from '@omnigraph/openapi';

describe('Reproduction #9637', () => {
  it('reuses one UUID scalar for nullable and non-null $ref to format+pattern UUID', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('repro', {
      endpoint: 'https://example.com',
      source: './fixtures/reprod-9637.yml',
      cwd: __dirname,
    });

    expect(() => printSchema(schema)).not.toThrow();
    const queryType = assertObjectType(schema.getQueryType());
    const itemType = assertObjectType(getNamedType(queryType.getFields().getItem.type));
    const idType = getNamedType(itemType.getFields().id.type);
    const parentIdType = getNamedType(itemType.getFields().parent_id.type);
    expect(idType.name).toBe('UUID');
    expect(parentIdType.name).toBe('UUID');
    expect(idType).toBe(parentIdType);
    expect(schema.getType('UUID2')).toBeUndefined();
  });
});
