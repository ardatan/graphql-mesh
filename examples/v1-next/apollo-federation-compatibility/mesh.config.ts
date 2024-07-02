import {
  createFederationTransform,
  defineConfig as defineComposeConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { useApolloInlineTrace } from '@graphql-yoga/plugin-apollo-inline-trace';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('products', {
        endpoint: 'http://localhost:4444/graphql',
        source: './src/typeDefs.graphql',
      }),
      transforms: [
        createFederationTransform({
          Query: {
            extends: true,
          },
          Product: {
            key: [
              {
                fields: 'id',
                resolveReference: {
                  fieldName: 'product',
                },
              },
              {
                fields: 'sku package',
                resolveReference: {
                  fieldName: 'productBySkuAndPackage',
                },
              },
              {
                fields: 'sku variation { id }',
                resolveReference: {
                  fieldName: 'productBySkuAndVariationId',
                  argsExpr: 'sku: $key.sku, variationId: $key.variation.id',
                },
              },
            ],
          },
          'Product.createdBy': {
            provides: {
              fields: 'totalProductsCreated',
            },
          },
          'Product.notes': {
            tag: {
              name: 'internal',
            },
          },
          DeprecatedProduct: {
            key: {
              fields: 'sku package',
              resolveReference: {
                fieldName: 'deprecatedProduct',
                argsExpr: 'sku: $key.sku, package: $key.package',
              },
            },
          },
          ProductResearch: {
            key: {
              fields: 'study { caseNumber }',
              resolveReference: {
                fieldName: 'productResearch',
                argsExpr: 'caseNumber: $key.study.caseNumber',
              },
            },
          },
          ProductDimension: {
            shareable: true,
          },
          'ProductDimension.unit': {
            inaccessible: true,
          },
          User: {
            extends: true,
            key: {
              fields: 'email',
              resolveReference: {
                fieldName: 'user',
              },
            },
          },
          'User.averageProductsCreatedPerYear': {
            requires: {
              fields: 'totalProductsCreated yearsOfEmployment',
            },
          },
          'User.email': {
            external: true,
          },
          'User.name': {
            override: {
              from: 'users',
            },
          },
          'User.totalProductsCreated': {
            external: true,
          },
          'User.yearsOfEmployment': {
            external: true,
          },
          Inventory: {
            key: {
              fields: 'id',
              resolveReference: {
                fieldName: 'inventory',
              },
            },
            interfaceObject: true,
          },
        }),
      ],
    },
  ],
});

export const serveConfig = defineServeConfig({
  plugins: () => [useApolloInlineTrace()],
});
