import { GraphQLUnionType } from 'graphql';
import { getDirective, printSchemaWithDirectives } from '@graphql-tools/utils';
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
    const unionType = CategoryUnion as GraphQLUnionType;
    const discriminatorDirective = getDirective(schema, unionType, 'discriminator');
    expect(discriminatorDirective).toBeDefined();
    expect(discriminatorDirective![0]).toEqual({
      subgraph: 'reprod-9088',
      field: 'template',
      mapping: [
        ['categoryListing', 'CategoryCategoryListing'],
        ['categoryDefault', 'CategoryDefault'],
        ['categoryRoot', 'CategoryCategoryRoot'],
        ['categoryAtmosphere', 'CategoryCategoryAtmosphere'],
        ['categorySuggestions', 'CategoryCategorySuggestions'],
        ['pillar', 'CategoryPillar'],
      ],
    });
  });
});
