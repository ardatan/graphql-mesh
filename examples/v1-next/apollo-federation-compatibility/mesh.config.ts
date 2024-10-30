import { defineConfig as defineGatewayConfig } from '@graphql-hive/gateway';
import {
  createFederationTransform,
  defineConfig as defineComposeConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';
import { useApolloInlineTrace } from '@graphql-yoga/plugin-apollo-inline-trace';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('products', {
        endpoint: 'http://0.0.0.0:4444/graphql',
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
                fields: 'sku package',
                resolveReference: {
                  fieldName: 'productBySkuAndPackage',
                },
              },
              {
                fields: 'sku variation { id }',
                resolveReference: {
                  fieldName: 'productBySkuAndVariationId',
                  // Needed because it cannot infer the args from the key that has nested fields
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
            interfaceObject: true,
          },
        }),
      ],
    },
  ],
});

export const gatewayConfig = defineGatewayConfig({
  plugins: () => [useApolloInlineTrace()],
});
