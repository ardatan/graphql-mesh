import { GraphQLUnionType } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '@omnigraph/openapi';

describe('Reproduction of #9088', () => {
  it('generates the schema correctly', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('reprod-9088', {
      source: './fixtures/reprod-9088.json',
      cwd: __dirname,
    });
    const CategoryUnion = schema.getType('Category');
    expect(CategoryUnion).toBeDefined();
    expect(CategoryUnion).toBeInstanceOf(GraphQLUnionType);
    // Discriminator is baked into Connectors `__typename: $.template->match(...)`.
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).not.toContain('@discriminator');
    expect(sdl).toContain('__typename:');
    expect(sdl).toContain('$.template->match(');
    expect(sdl).toContain('categoryListing');
    expect(sdl).toContain('CategoryCategoryListing');
  });
});
