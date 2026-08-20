import {
  assertObjectType,
  getNamedType,
  isObjectType,
  isUnionType,
  printSchema,
} from 'graphql';
import loadGraphQLSchemaFromOpenAPI from '@omnigraph/openapi';

describe('Reproduction #9641', () => {
  it('keeps Void_container in a 204 + error response union', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('repro', {
      endpoint: 'https://example.com',
      source: './fixtures/reprod-9641.yml',
      cwd: __dirname,
    });

    expect(() => printSchema(schema)).not.toThrow();
    const mutationType = assertObjectType(schema.getMutationType());
    const field = mutationType.getFields().deleteThing;
    const named = getNamedType(field.type);
    expect(isUnionType(named)).toBe(true);
    if (!isUnionType(named)) {
      return;
    }
    const members = named.getTypes().map(t => t.name);
    expect(members).toEqual(
      expect.arrayContaining(['Void_container', 'NotFound', 'Conflict']),
    );
    expect(members).toHaveLength(3);
    expect(printSchema(schema)).toContain('Void_container');
  });

  it('keeps Void_container when 204 is paired with a single error schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('repro', {
      endpoint: 'https://example.com',
      source: './fixtures/multiple-responses-swagger.yml',
      cwd: __dirname,
    });

    const mutationType = assertObjectType(schema.getMutationType());
    const field = mutationType.getFields().post;
    const named = getNamedType(field.type);
    expect(isUnionType(named)).toBe(true);
    if (!isUnionType(named)) {
      return;
    }
    const members = named.getTypes().map(t => t.name);
    expect(members).toEqual(expect.arrayContaining(['Void_container', 'Error']));
    expect(members).toHaveLength(2);
    // Must not collapse to the bare error object type
    expect(isObjectType(named)).toBe(false);
  });
});
