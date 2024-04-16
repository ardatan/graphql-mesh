import { GraphQLObjectType, parse } from 'graphql';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';
import { createDefaultExecutor } from '@graphql-mesh/transport-common';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import {
  createExecutablePlanForOperation,
  serializeExecutableOperationPlan,
} from '../../../src/operations';
import { metadataSchema } from './services/metadata';
import { productsSchema } from './services/products';

describe('Computed fields', () => {
  const fusiongraph = composeSubgraphs([
    {
      name: 'products',
      schema: productsSchema,
    },
    {
      name: 'metadata',
      schema: metadataSchema,
    },
  ]);
  // Add directives
  const productType = fusiongraph.getType('Product') as GraphQLObjectType;
  const productTypeExts = (productType.extensions ||= {} as any);
  const productTypeDirectives = (productTypeExts.directives ||= [] as any);
  const resolverDirectives = (productTypeDirectives.resolver ||= [] as any);
  resolverDirectives.push({
    subgraph: 'metadata',
    operation: /* GraphQL */ `
      query ProductMetadata($Product_key: [ProductKey]) {
        _products(keys: $Product_key)
      }
    `,
    kind: 'BATCH',
  });
  const variableDirectives = (productTypeDirectives.variable ||= [] as any);
  variableDirectives.push({
    subgraph: 'metadata',
    name: 'Product_key',
    value: '{ categoryId: $Product_categoryId, metadataIds: $Product_metadataIds }',
  });
  const fieldMap = productType.getFields();
  const metadataField = fieldMap['metadata'];
  const metadataFieldExts = (metadataField.extensions ||= {} as any);
  const metadataFieldDirectives = (metadataFieldExts.directives ||= {} as any);
  const metadataFieldVariableDirectives = (metadataFieldDirectives.variable ||= [] as any);
  metadataFieldVariableDirectives.push({
    subgraph: 'products',
    name: 'Product_metadataIds',
    select: 'metadataIds',
  });
  const categoryField = fieldMap['category'];
  const categoryFieldExts = (categoryField.extensions ||= {} as any);
  const categoryFieldDirectives = (categoryFieldExts.directives ||= {} as any);
  const categoryFieldVariableDirectives = (categoryFieldDirectives.variable ||= [] as any);
  categoryFieldVariableDirectives.push({
    subgraph: 'products',
    name: 'Product_categoryId',
    select: 'categoryId',
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
            case 'products':
              return createDefaultExecutor(productsSchema);
            case 'metadata':
              return createDefaultExecutor(metadataSchema);
          }
        },
      };
    },
  });
  const exampleQuery = parse(/* GraphQL */ `
    query {
      products(upcs: [1, 2, 3, 4]) {
        name
        price
        category {
          name
        }
        metadata {
          __typename
          name
          ... on GeoLocation {
            name
            lat
            lon
          }
          ... on SportsTeam {
            location {
              name
              lat
              lon
            }
          }
          ... on TelevisionSeries {
            season
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
  it('executes correctly', async () => {
    const result = await fusiongraphExecutor({
      document: exampleQuery,
    });
    expect(result).toEqual({
      data: {
        products: [
          {
            category: null,
            metadata: [],
            name: 'iPhone',
            price: 699.99,
          },
          {
            category: {
              name: 'Cooking',
            },
            metadata: [
              {
                __typename: 'TelevisionSeries',
                name: 'Great British Baking Show',
                season: 7,
              },
              {
                __typename: 'GeoLocation',
                lat: 55.3781,
                lon: 3.436,
                name: 'Great Britain',
              },
            ],
            name: 'The Best Baking Cookbook',
            price: 15.99,
          },
          {
            category: {
              name: 'Travel',
            },
            metadata: [
              {
                __typename: 'GeoLocation',
                lat: 38.4161,
                lon: 63.6167,
                name: 'Argentina',
              },
            ],
            name: 'Argentina Guidebook',
            price: 24.99,
          },
          {
            category: {
              name: 'Sports',
            },
            metadata: [
              {
                __typename: 'GeoLocation',
                lat: 53.4621,
                lon: 2.2766,
                name: 'Old Trafford, Greater Manchester, England',
              },
              {
                __typename: 'SportsTeam',
                location: {
                  lat: 53.4621,
                  lon: 2.2766,
                  name: 'Old Trafford, Greater Manchester, England',
                },
                name: 'Manchester United',
              },
            ],
            name: 'Soccer Jersey',
            price: 47.99,
          },
        ],
      },
    });
  });
});
