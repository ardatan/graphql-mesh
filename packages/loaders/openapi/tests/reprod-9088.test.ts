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
    // Discriminator is baked into Connectors `$.template->match([value, { __typename }])`.
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).not.toContain('@discriminator');
    expect(sdl).toContain('$.template->match(');
    // Printed SDL escapes quotes inside the selection string (`\"categoryListing\"`).
    expect(sdl).toMatch(
      /\$\.template->match\([\s\S]*categoryListing[\s\S]*__typename:\s*\\"CategoryCategoryListing\\"/,
    );
  });
});
