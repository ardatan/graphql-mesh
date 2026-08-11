import { createTenv } from '@e2e/tenv';

const { compose, service, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [await service('vendure'), await service('strapi')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it('should match unordered Strapi collection results back to Vendure search keys', async () => {
  const { output } = await compose({
    services: [await service('vendure'), await service('strapi')],
    output: 'graphql',
  });

  const { execute } = await serve({ supergraph: output });

  // Client omits SKU on purpose — valueKeyField must still be fetched for correlation.
  await expect(
    execute({
      query: /* GraphQL */ `
        {
          search {
            id
            sku
            strapi_products {
              id
              title
            }
          }
        }
      `,
    }),
  ).resolves.toEqual({
    data: {
      search: [
        {
          id: 's-1',
          sku: 'sku-a',
          strapi_products: [
            { id: 'p-1', title: 'Product A' },
            { id: 'p-3', title: 'Product A variant' },
          ],
        },
        {
          id: 's-2',
          sku: 'sku-missing',
          strapi_products: [],
        },
        {
          id: 's-3',
          sku: 'sku-b',
          strapi_products: [{ id: 'p-2', title: 'Product B' }],
        },
      ],
    },
  });
});
