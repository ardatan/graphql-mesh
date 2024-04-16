import { parse } from 'graphql';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { MapperKind, mapSchema, printSchemaWithDirectives } from '@graphql-tools/utils';
import { catalogSchema } from './services/catalog';
import { reviewsSchema } from './services/reviews';
import { vendorsSchema } from './services/vendors';

describe('Type merging with multiple keys', () => {
  let fusiongraph = composeSubgraphs([
    {
      name: 'catalog',
      schema: catalogSchema,
    },
    {
      name: 'reviews',
      schema: reviewsSchema,
    },
    {
      name: 'vendors',
      schema: vendorsSchema,
    },
  ]);
  // Add directives
  fusiongraph = mapSchema(fusiongraph, {
    [MapperKind.OBJECT_TYPE]: type => {
      if (type.name === 'Product') {
        const typeExtensions: any = (type.extensions ||= {});
        const directiveExtensions: any = (typeExtensions.directives ||= {});
        const variableDirectives = (directiveExtensions.variable ||= []);
        const resolverDirectives = (directiveExtensions.resolver ||= []);
        variableDirectives.push(
          {
            subgraph: 'catalog',
            name: 'Product_key',
            value: '{ upc: $upc }',
          },
          {
            subgraph: 'reviews',
            name: 'Product_key',
            value: '{ id: $id }',
          },
          {
            subgraph: 'vendors',
            name: 'Product_key',
            value: '{ upc: $upc, id: $id }',
          },
        );
        resolverDirectives.push({
          subgraph: 'vendors',
          operation:
            'query productsByKeys($Product_key: [ProductKey]) { productsByKeys(keys: $Product_key) }',
          kind: 'BATCH',
        });
      }
      return type;
    },
  });
  it('composes correctly', () => {
    expect(printSchemaWithDirectives(fusiongraph)).toMatchSnapshot();
  });
  const { fusiongraphExecutor } = getExecutorForFusiongraph({
    fusiongraph,
    transports() {
      return {
        getSubgraphExecutor({ subgraphName }) {
          switch (subgraphName) {
            case 'catalog':
              return createDefaultExecutor(catalogSchema);
            case 'reviews':
              return createDefaultExecutor(reviewsSchema);
            case 'vendors':
              return createDefaultExecutor(vendorsSchema);
          }
        },
      };
    },
  });
  it('should work', async () => {
    const result = await fusiongraphExecutor({
      document: parse(/* GraphQL */ `
        query {
          # catalog service
          productsByUpcs(upcs: ["1"]) {
            upc
            name
            retailPrice
            reviews {
              id
              body
            }
          }

          # vendors service
          productsByKeys(keys: [{ upc: "1" }, { id: "101" }]) {
            id
            upc
            name
            retailPrice
            reviews {
              id
              body
            }
          }

          # reviews service
          productsByIds(ids: ["101"]) {
            id
            name
            retailPrice
            reviews {
              id
              body
            }
          }
        }
      `),
    });
    expect(result).toEqual({
      data: {
        productsById: [
          {
            id: '101',
            name: 'Table',
            retailPrice: 879,
            reviews: [
              {
                body: 'Love it!',
                id: '1',
              },
              {
                body: 'Prefer something else.',
                id: '4',
              },
            ],
          },
        ],
        productsByKey: [
          {
            id: '101',
            name: 'Table',
            retailPrice: 879,
            reviews: [
              {
                body: 'Love it!',
                id: '1',
              },
              {
                body: 'Prefer something else.',
                id: '4',
              },
            ],
            upc: '1',
          },
          {
            id: '101',
            name: 'Table',
            retailPrice: 879,
            reviews: [
              {
                body: 'Love it!',
                id: '1',
              },
              {
                body: 'Prefer something else.',
                id: '4',
              },
            ],
            upc: '1',
          },
        ],
        productsByUpc: [
          {
            name: 'Table',
            retailPrice: 879,
            reviews: [
              {
                body: 'Love it!',
                id: '1',
              },
              {
                body: 'Prefer something else.',
                id: '4',
              },
            ],
            upc: '1',
          },
        ],
      },
    });
  });
});
