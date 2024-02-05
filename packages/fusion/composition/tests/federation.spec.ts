// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'path';
import { ApolloServer } from 'apollo-server';
import { buildSchema, parse } from 'graphql';
import {
  createExecutablePlanForOperation,
  executeOperation,
  OnExecuteFn,
  serializeExecutableOperationPlan,
} from '@graphql-mesh/fusion-execution';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { accountsServer } from '../../../../examples/federation-example/services/accounts/server';
import { inventoryServer } from '../../../../examples/federation-example/services/inventory/server';
import { productsServer } from '../../../../examples/federation-example/services/products/server';
import { reviewsServer } from '../../../../examples/federation-example/services/reviews/server';
import { convertSupergraphToFusiongraph } from '../src/supergraph';

const fragments = {
  Review: /* GraphQL */ `
    fragment Review on Review {
      id
      body
    }
  `,
  Product: /* GraphQL */ `
    fragment Product on Product {
      inStock
      name
      price
      shippingEstimate
      upc
      weight
    }
  `,
  User: /* GraphQL */ `
    fragment User on User {
      id
      username
      name
    }
  `,
};

const queries = {
  topProducts: /* GraphQL */ `
    ${fragments.Product}
    ${fragments.Review}
    ${fragments.User}
    query TestQuery {
      topProducts {
        ...Product
        reviews {
          ...Review
          author {
            ...User
          }
        }
      }
    }
  `,
  users: /* GraphQL */ `
    ${fragments.Product}
    ${fragments.Review}
    ${fragments.User}
    query TestQuery {
      users {
        ...User
        reviews {
          ...Review
          # product {
          #   ...Product
          # }
        }
      }
    }
  `,
};

describe('Federation', () => {
  const supergraphSdl = readFileSync(
    join(__dirname, 'fixtures/gateway/supergraph.graphql'),
    'utf8',
  );
  let fusiongraph = convertSupergraphToFusiongraph(supergraphSdl);
  it('converts a Supergraph to a Fusiongraph', () => {
    const fusiongraphSdl = printSchemaWithDirectives(fusiongraph);
    expect(fusiongraphSdl).toMatchSnapshot();
    fusiongraph = buildSchema(fusiongraphSdl, { assumeValid: true, assumeValidSDL: true });
  });
  Object.entries(queries).forEach(([queryName, queryStr]) => {
    const operationDoc = parse(queryStr);
    it(`plans \`${queryName}\` query`, async () => {
      const executablePlan = createExecutablePlanForOperation({
        fusiongraph,
        document: operationDoc,
        operationName: 'TestQuery',
      });
      const serializedPlan = serializeExecutableOperationPlan(executablePlan);
      expect(serializedPlan).toMatchSnapshot();
    });
  });
  describe('execution', () => {
    let accountsServerInstance: ApolloServer;
    let inventoryServerInstance: ApolloServer;
    let productsServerInstance: ApolloServer;
    let reviewsServerInstance: ApolloServer;
    const onExecute = (async (subgraphName, query, variables) => {
      switch (subgraphName) {
        case 'accounts':
          return accountsServerInstance.executeOperation({ query, variables });
        case 'inventory':
          return inventoryServerInstance.executeOperation({ query, variables });
        case 'products':
          return productsServerInstance.executeOperation({ query, variables });
        case 'reviews':
          return reviewsServerInstance.executeOperation({ query, variables });
      }
      return null;
    }) as OnExecuteFn;
    beforeAll(async () => {
      accountsServerInstance = await accountsServer();
      inventoryServerInstance = await inventoryServer();
      productsServerInstance = await productsServer();
      reviewsServerInstance = await reviewsServer();
    });
    afterAll(async () => {
      await accountsServerInstance.stop();
      await inventoryServerInstance.stop();
      await productsServerInstance.stop();
      await reviewsServerInstance.stop();
    });
    Object.entries(queries).forEach(([queryName, queryStr]) => {
      const operationDoc = parse(queryStr);
      it(`executes \`${queryName}\` query`, async () => {
        const response = await executeOperation({
          document: operationDoc,
          fusiongraph,
          onExecute,
        });
        expect(response).toMatchSnapshot();
      });
    });
  });
});
