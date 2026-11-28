import { buildSubgraphSchema } from '@apollo/subgraph';
import { dispose } from '@graphql-mesh/utils';
import { getStitchedSchemaFromSupergraphSdl } from '../src/index';
import {
  composeLocalSchemasWithApollo,
  createDisposableServer,
  DisposableServer,
} from './helpers';
import { AsyncDisposableStack } from '@whatwg-node/disposablestack';
import { fetch } from '@whatwg-node/fetch';
import { FormattedExecutionResult, GraphQLError, parse } from 'graphql';
import { createYoga } from 'graphql-yoga';

describe('Yoga gateway - subgraph unavailable', () => {
  describe('subgraph2 is unavailable', () => {
    const disposableStack = new AsyncDisposableStack();
    let gatewayServer: DisposableServer;
    beforeAll(async () => {
      const subgraph1Schema = buildSubgraphSchema([{
        typeDefs: parse(/* GraphQL */ `
          type Query {
            testNestedField: TestNestedField
          }

          type TestNestedField {
            subgraph1: TestSubgraph1Query
          }

          type TestSubgraph1Query {
            testSuccessQuery: TestUser1
            testErrorQuery: TestUser1
          }

          type TestUser1 {
            id: String!
            email: String!
            sub1: Boolean!
          }
        `),
        resolvers: {
          Query: {
            testNestedField: () => ({
              subgraph1: () => ({
                testSuccessQuery: () => {
                  return {
                    id: 'user1',
                    email: 'user1@example.com',
                    sub1: true,
                  };
                },
                testErrorQuery: () => {
                  throw new GraphQLError('My original subgraph1 error!', {
                    extensions: {
                      code: 'BAD_REQUEST',
                    },
                  });
                },
              }),
            }),
          },
        },
      }]);
      const subgraph1Yoga = createYoga({
        logging: false,
        schema: subgraph1Schema,
      });
      disposableStack.use(subgraph1Yoga);
      const subgraph1Server = await createDisposableServer(subgraph1Yoga);
      disposableStack.use(subgraph1Server);
      const subgraph2Schema = buildSubgraphSchema([{
        typeDefs: parse(/* GraphQL */ `
          type Query {
            testNestedField: TestNestedField
          }

          type TestNestedField {
            subgraph2: TestSubgraph2Query
          }

          type TestSubgraph2Query {
            testSuccessQuery: TestUser2
            testErrorQuery: TestUser2
          }

          type TestUser2 {
            id: String!
            email: String!
            sub2: Boolean!
          }
        `),
        resolvers: {
          Query: {
            testNestedField: () => ({
              subgraph2: () => ({
                testSuccessQuery: () => {
                  return {
                    id: 'user2',
                    email: 'user1@example.com',
                    sub2: true,
                  };
                },
                testErrorQuery: () => {
                  throw new GraphQLError('My original subgraph2 error!', {
                    extensions: {
                      code: 'BAD_REQUEST',
                    },
                  });
                },
              }),
            }),
          },
        },
      }]);
      const subgraph2Yoga = createYoga({
        logging: false,
        schema: subgraph2Schema,
      });
      disposableStack.use(subgraph2Yoga);
      const subgraph2Server = await createDisposableServer(subgraph2Yoga);
      const supergraphSdl = await composeLocalSchemasWithApollo([
        {
          schema: subgraph1Schema,
          name: 'subgraph1',
          url: `${subgraph1Server.url}/graphql`,
        },
        {
          schema: subgraph2Schema,
          name: 'subgraph2',
          url: `${subgraph2Server.url}/graphql`,
        },
      ]);
      const gatewayYoga = createYoga({
        logging: false,
        schema: getStitchedSchemaFromSupergraphSdl({ supergraphSdl }),
        maskedErrors: false,
      });
      disposableStack.use(gatewayYoga);
      gatewayServer = await createDisposableServer(gatewayYoga);
      disposableStack.use(gatewayServer);
      // Close subgraph 2
      await dispose(subgraph2Server);
    });
    afterAll(() => disposableStack.disposeAsync());
    it('multiSubgraphQuery', async () => {
      const response = await fetch(`${gatewayServer.url}/graphql`, {
        method: 'POST',
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              testNestedField {
                subgraph1 {
                  testSuccessQuery {
                    id
                    email
                    sub1
                  }
                }
                subgraph2 {
                  testSuccessQuery {
                    id
                    email
                    sub2
                  }
                }
              }
            }
          `,
        }),
        headers: { 'content-type': 'application/json' },
      });
      const result: FormattedExecutionResult = await response.json();

      expect(response.status).toBe(200);
      expect(result.data).toEqual({
        testNestedField: {
          subgraph1: {
            testSuccessQuery: {
              id: 'user1',
              email: 'user1@example.com',
              sub1: true,
            },
          },
          subgraph2: null,
        },
      });
      // Soften request.body - backbone plan documents may differ from classic.
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('connect'),
            extensions: expect.objectContaining({
              code: 'SUBREQUEST_HTTP_ERROR',
              request: expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('testNestedField{subgraph2{'),
              }),
            }),
            path: ['testNestedField'],
          }),
        ]),
      );
    });
    it('subgraph2Query', async () => {
      const response = await fetch(`${gatewayServer.url}/graphql`, {
        method: 'POST',
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              testNestedField {
                subgraph2 {
                  testErrorQuery {
                    id
                    email
                    sub2
                  }
                }
              }
            }
          `,
        }),
        headers: { 'content-type': 'application/json' },
      });
      const result: FormattedExecutionResult = await response.json();

      expect(response.status).toBe(200);
      expect(result.data).toEqual({
        testNestedField: null,
      });
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('connect'),
            extensions: expect.objectContaining({
              code: 'SUBREQUEST_HTTP_ERROR',
              request: expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('testNestedField{subgraph2{'),
              }),
            }),
            path: ['testNestedField'],
          }),
        ]),
      );
    });
  });
});
