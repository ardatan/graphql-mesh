import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { createSchema, createYoga } from 'graphql-yoga';
import { Inventory, Product, ProductResearch, Resolvers, User } from './resolvers-types';

const productResearch: ProductResearch[] = [
  {
    study: {
      caseNumber: '1234',
      description: 'Federation Study',
    },
  },
  {
    study: {
      caseNumber: '1235',
      description: 'Studio Study',
    },
  },
];

const products: Omit<Product, 'research'>[] = [
  {
    id: 'apollo-federation',
    sku: 'federation',
    package: '@apollo/federation',
    variation: { id: 'OSS', __typename: 'ProductVariation' },
  },
  {
    id: 'apollo-studio',
    sku: 'studio',
    package: '',
    variation: { id: 'platform', __typename: 'ProductVariation' },
  },
];

const deprecatedProduct = {
  sku: 'apollo-federation-v1',
  package: '@apollo/federation-v1',
  reason: 'Migrate to Federation V2',
};

const user: User = {
  email: 'support@apollographql.com',
  name: 'Jane Smith',
  totalProductsCreated: 1337,
  yearsOfEmployment: 10,
};

const inventory: Inventory = {
  id: 'apollo-oss',
  deprecatedProducts: [deprecatedProduct],
};

const resolvers: Resolvers = {
  Query: {
    product(_: unknown, args: { id: string }) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return products.find(p => p.id === args.id)! as unknown as Product;
    },
    deprecatedProduct: (_, args) => {
      if (args.sku === deprecatedProduct.sku && args.package === deprecatedProduct.package) {
        return deprecatedProduct;
      }
      return null;
    },
    productResearch: (_, args) => {
      return productResearch.find(p => p.study.caseNumber === args.caseNumber) || null;
    },
    productBySkuAndPackage(_, args) {
      return (
        (products.find(p => p.sku === args.sku && p.package === args.package) as Product) || null
      );
    },
    productBySkuAndVariationId(_, args) {
      return (products.find(
        p => p.sku === args.sku && p.variation && p.variation.id === args.variationId,
      ) || null) as Product;
    },
    user(_, args) {
      if (args.email) {
        const user = {
          email: args.email,
          name: 'Jane Smith',
          totalProductsCreated: 1337,
        } as User;
        if (args.totalProductsCreated) {
          user.totalProductsCreated = args.totalProductsCreated;
        }
        if (args.yearsOfEmployment) {
          user.yearsOfEmployment = args.yearsOfEmployment;
        }
        return user;
      }
      return null;
    },
    inventory(_, args) {
      if (args.id === 'apollo-oss') {
        return inventory;
      }
      return null;
    },
  },
  DeprecatedProduct: {
    createdBy: () => {
      return user;
    },
  },
  Product: {
    variation(parent) {
      if (parent.variation) return parent.variation;
      const p = products.find(p => p.id === parent.id);
      return p?.variation || null;
    },

    research: reference => {
      if (reference.id === 'apollo-federation') {
        return [productResearch[0]];
      }
      if (reference.id === 'apollo-studio') {
        return [productResearch[1]];
      }
      return [];
    },

    dimensions() {
      return { size: 'small', weight: 1, unit: 'kg' };
    },

    createdBy() {
      return user;
    },
  },
  User: {
    averageProductsCreatedPerYear: user => {
      if (user.email !== 'support@apollographql.com') {
        throw new Error("user.email was not 'support@apollographql.com'");
      }
      return Math.round((user.totalProductsCreated || 0) / user.yearsOfEmployment);
    },
    name() {
      return 'Jane Smith';
    },
  },
};

const yoga = createYoga({
  schema: createSchema({
    typeDefs: readFileSync('./typeDefs.graphql', 'utf-8'),
    resolvers,
  }),
});

const server = createServer(yoga);

server.listen(4444, () => {
  console.log(`🚀 Server ready at http://localhost:4444`);
});
