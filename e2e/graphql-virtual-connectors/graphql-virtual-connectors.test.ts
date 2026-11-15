import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

describe('GraphQL stub + Connectors entity fill without @merge', () => {
  jest.retryTimes(3);
  const { compose, serve, service } = createTenv(__dirname);

  let catalog: Service;
  let products: Service;

  beforeAll(async () => {
    catalog = await service('catalog');
    products = await service('products');
  });

  it('composes Connectors entity:true + GraphQL catalog stub without Mesh @merge', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [products, catalog],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
    // Connectors owner: getProduct(id:) → entity: true (JSONSelection fill).
    const getProduct = result.match(/getProduct\([\s\S]*?\):\s*Product[^\n]*/)?.[0] || '';
    expect(getProduct).toContain('entity: true');
    expect(getProduct).not.toContain('@merge');
    // Catalog contributes isFeatured; Products owns name via connect.
    expect(result).toMatch(/isFeatured:\s*Boolean/);
    expect(result).not.toMatch(/@merge\(/);
    expect(result).not.toMatch(/import:\s*\[[^\]]*@merge/);
    // No Mesh stitching @source / @meshSource on the Connectors path.
    expect(result).not.toMatch(/@meshSource\(/);
  });

  describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
    it('resolves featuredProduct stub from GraphQL + name from Connectors', async () => {
      const composition = await compose({
        output: 'graphql',
        services: [products, catalog],
      });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
      });
      const queryResult = await execute({
        query: /* GraphQL */ `
          query {
            featuredProduct {
              id
              isFeatured
              name
              price
            }
            getProduct(id: "p2") {
              id
              name
              price
            }
          }
        `,
      });
      expect(queryResult.errors).toBeFalsy();
      expect(queryResult.data).toEqual({
        featuredProduct: {
          id: 'p1',
          isFeatured: true,
          name: 'GraphQL Mug',
          price: 12.5,
        },
        getProduct: {
          id: 'p2',
          name: 'Federation Tee',
          price: 24,
        },
      });
    });
  });
});
