/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-extraneous-dependencies */
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildSchema, parse } from 'graphql';
import { ApolloServer } from '@apollo/server';
import {
  createExecutablePlanForOperation,
  executeOperation,
  OnExecuteFn,
  serializeExecutableOperationPlan,
} from '@graphql-mesh/fusion-execution';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { accountsServer } from '../../../../examples/v1-next/federation-example/services/accounts/server';
import { inventoryServer } from '../../../../examples/v1-next/federation-example/services/inventory/server';
import { productsServer } from '../../../../examples/v1-next/federation-example/services/products/server';
import { reviewsServer } from '../../../../examples/v1-next/federation-example/services/reviews/server';
import { convertSupergraphToFusiongraph } from '../src';

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
          product {
            ...Product
            reviews {
              ...Review
              author {
                ...User
                reviews {
                  ...Review
                  product {
                    ...Product
                  }
                }
              }
            }
          }
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
  function handleExecutionResultFromApollo(
    apolloResult: Awaited<ReturnType<ApolloServer['executeOperation']>>,
  ) {
    if (apolloResult.body.kind === 'single') {
      return apolloResult.body.singleResult;
    }
    throw new Error('Not implemented');
  }
  describe('execution', () => {
    let accountsServerInstance: ApolloServer;
    let inventoryServerInstance: ApolloServer;
    let productsServerInstance: ApolloServer;
    let reviewsServerInstance: ApolloServer;
    const onExecute = (async (subgraphName, query, variables) => {
      switch (subgraphName) {
        case 'accounts':
          return accountsServerInstance
            .executeOperation({ query, variables })
            .then(handleExecutionResultFromApollo);
        case 'inventory':
          return inventoryServerInstance
            .executeOperation({ query, variables })
            .then(handleExecutionResultFromApollo);
        case 'products':
          return productsServerInstance
            .executeOperation({ query, variables })
            .then(handleExecutionResultFromApollo);
        case 'reviews':
          return reviewsServerInstance
            .executeOperation({ query, variables })
            .then(handleExecutionResultFromApollo);
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
