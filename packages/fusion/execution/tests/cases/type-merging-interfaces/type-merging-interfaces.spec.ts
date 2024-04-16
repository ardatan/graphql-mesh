import { parse } from 'graphql';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import {
  createExecutablePlanForOperation,
  serializeExecutableOperationPlan,
} from '../../../src/operations';
import { productsSchema } from './services/products';
import { storefrontsSchema } from './services/storefronts';

describe('Cross-service interfaces', () => {
  const fusiongraph = composeSubgraphs([
    {
      name: 'products',
      schema: productsSchema,
    },
    {
      name: 'storefronts',
      schema: storefrontsSchema,
    },
  ]);
  const { fusiongraphExecutor } = getExecutorForFusiongraph({
    fusiongraph,
    transports() {
      return {
        getSubgraphExecutor({ subgraphName }) {
          switch (subgraphName) {
            case 'products':
              return createDefaultExecutor(productsSchema);
            case 'storefronts':
              return createDefaultExecutor(storefrontsSchema);
          }
        },
      };
    },
  });
  it('composes the schema', async () => {
    expect(printSchemaWithDirectives(fusiongraph)).toMatchSnapshot();
  });
  const exampleQuery = parse(/* GraphQL */ `
    query {
      storefront(id: "1") {
        id
        name
        productOfferings {
          __typename
          id
          name
          price
          ... on ProductDeal {
            products {
              name
              price
            }
          }
        }
      }
    }
  `);
  it('plans correctly', async () => {
    const plan = createExecutablePlanForOperation({
      fusiongraph,
      document: exampleQuery,
    });
    expect(serializeExecutableOperationPlan(plan)).toMatchSnapshot();
  });
  it('should work', async () => {
    const result = await fusiongraphExecutor({
      document: exampleQuery,
    });
    expect(result).toEqual({
      data: {
        storefront: {
          id: '1',
          name: 'eShoppe',
          productOfferings: [
            {
              __typename: 'Product',
              id: '1',
              name: 'iPhone',
              price: 699.99,
            },
            {
              __typename: 'ProductDeal',
              id: '1',
              name: 'iPhone + Survival Guide',
              price: 679.99,
              products: [
                {
                  name: 'iPhone',
                  price: 699.99,
                },
                {
                  name: 'iOS Survival Guide',
                  price: 24.99,
                },
              ],
            },
            {
              __typename: 'Product',
              id: '2',
              name: 'Apple Watch',
              price: 399.99,
            },
          ],
        },
      },
    });
  });
});
