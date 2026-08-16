import { assertObjectType, getNamedType } from 'graphql';
import loadGraphQLSchemaFromOpenAPI from '@omnigraph/openapi';

describe('Reproduction #8657', () => {
  it('treats object-only additionalProperties response fields as JSON', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('test', {
      source: './fixtures/reprod-8657.yml',
      cwd: __dirname,
    });

    const queryType = assertObjectType(schema.getQueryType());
    const postOutputType = assertObjectType(getNamedType(queryType.getFields().post.type));
    const postFields = postOutputType.getFields();

    expect(getNamedType(postFields.additionalPropertiesTrue.type).name).toBe('JSON');
    expect(getNamedType(postFields.additionalPropertiesInteger.type).name).toBe('JSON');
    expect(getNamedType(postFields.additionalPropertiesObject.type).name).toBe('JSON');
    expect(getNamedType(postFields.additionalPropertiesObjectWithCustomTitle.type).name).toBe(
      'JSON',
    );
    expect(getNamedType(postFields.additionalPropertiesArrayInteger.type).name).toBe('JSON');
    expect(getNamedType(postFields.additionalPropertiesObjectRef.type).name).toBe('JSON');
    expect(getNamedType(postFields.additionalPropertiesObjectRefNested.type).name).toBe('JSON');
  });
});
