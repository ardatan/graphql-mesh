import { fetch } from '@whatwg-node/fetch';
import { createServer, Server } from 'http';
import { graphql, execute, subscribe, GraphQLSchema } from 'graphql';
import { SubscriptionServer, SubscriptionClient, ServerOptions } from 'subscriptions-transport-ws';
import ws from 'ws';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { startServer, stopServer, pubsub } from './example_api7_server';

let createdSchema: GraphQLSchema;
const TEST_PORT = 3009;
const HTTP_PORT = 3008;
// Update PORT for this test case:
const baseUrl = `http://localhost:${HTTP_PORT}/api`;

let wsServer: Server;
let subscriptionServer: SubscriptionServer;

describe('OpenAPI Loader: example_api7', () => {
  // Set up the schema first and run example API servers
  beforeAll(async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('example_api7', {
      fetch,
      baseUrl,
      source: './fixtures/example_oas7.json',
      cwd: __dirname,
    });

    createdSchema = schema;
    try {
      wsServer = createServer((req, res) => {
        res.writeHead(404);
        res.end();
      });

      wsServer.listen(TEST_PORT);

      subscriptionServer = new SubscriptionServer(
        {
          execute,
          subscribe,
          schema,
          onConnect: () => {
            return { pubsub };
          },
        } as ServerOptions,
        {
          server: wsServer,
          path: '/subscriptions',
        }
      );
    } catch (e) {
      console.log('error', e);
    }
    await startServer(HTTP_PORT);
  });

  /**
   * Shut down API servers
   */
  afterAll(async () => {
    await Promise.all([subscriptionServer.close(), wsServer.close(), stopServer()]);
  });

  it('Receive data from the subscription after creating a new instance', async () => {
    const userName = 'Carlos';
    const deviceName = 'Bot';

    const query = /* GraphQL */ `
      subscription watchDevice($method: String!, $userName: String!) {
        devicesEventListener(method: $method, userName: $userName) {
          name
          status
        }
      }
    `;

    const query2 = /* GraphQL */ `
      mutation ($deviceInput: Device_Input!) {
        createDevice(input: $deviceInput) {
          ... on Device {
            name
            userName
            status
          }
        }
      }
    `;

    await new Promise<void>((resolve, reject) => {
      const client = new SubscriptionClient(`ws://localhost:${TEST_PORT}/subscriptions`, {}, ws);

      client.onError(e => reject(e));

      client
        .request({
          query,
          operationName: 'watchDevice',
          variables: {
            method: 'POST',
            userName,
          },
        })
        .subscribe({
          next: result => {
            if (result.errors) {
              reject(result.errors);
            }

            if (result.data) {
              expect(result.data).toEqual({
                devicesEventListener: {
                  name: deviceName,
                  status: false,
                },
              });
              resolve();
            }
          },
          error: e => reject(e),
        });

      setTimeout(() => {
        graphql({
          schema: createdSchema,
          source: query2,
          variableValues: {
            deviceInput: {
              name: `${deviceName}`,
              userName: `${userName}`,
              status: false,
            },
          },
        })
          .then(res => {
            if (!res.data) {
              console.log(res.errors?.[0]);
              reject(new Error('Failed mutation'));
            }
          })
          .catch(reject);
      }, 500);
    });
  });
});
