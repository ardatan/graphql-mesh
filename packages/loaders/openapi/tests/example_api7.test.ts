import { createServer, YogaNodeServerInstance } from '@graphql-yoga/node';
import { fetch } from '@whatwg-node/fetch';
import { graphql, GraphQLSchema } from 'graphql';
import EventSource from 'eventsource';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { startServer, stopServer, pubsub } from './example_api7_server';

let createdSchema: GraphQLSchema;
const TEST_PORT = 3009;
const HTTP_PORT = 3008;
// Update PORT for this test case:
const baseUrl = `http://localhost:${HTTP_PORT}/api`;

let yogaServer: YogaNodeServerInstance<any, any, any>;

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
      yogaServer = createServer({
        schema,
        port: TEST_PORT,
        context: { pubsub },
      });

      await yogaServer.start();
    } catch (e) {
      console.log('error', e);
    }
    await startServer(HTTP_PORT);
  });

  /**
   * Shut down API servers
   */
  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await Promise.all([yogaServer.stop(), stopServer()]);
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
      const url = new URL(`http://localhost:${TEST_PORT}/graphql`);

      url.searchParams.append('query', query);
      url.searchParams.append(
        'variables',
        JSON.stringify({
          method: 'POST',
          userName,
        })
      );

      const eventsource = new EventSource(url.href, {
        withCredentials: true, // is this needed?
      });

      eventsource.onerror = e => {
        eventsource.close();
        reject(e);
      };

      eventsource.onmessage = event => {
        const res = JSON.parse(event.data);

        expect(res.data).toEqual({
          devicesEventListener: {
            name: deviceName,
            status: false,
          },
        });

        eventsource.close();
        resolve();
      };

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
