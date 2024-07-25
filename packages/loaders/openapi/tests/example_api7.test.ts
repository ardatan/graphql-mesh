/* eslint-disable import/no-nodejs-modules */

/* eslint-disable no-unreachable-loop */
import { GraphQLSchema } from 'graphql';
import { createYoga, type YogaServerInstance } from 'graphql-yoga';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';
import { exampleApi7, pubsub } from './example_api7_server.js';

let createdSchema: GraphQLSchema;

let yogaServer: YogaServerInstance<any, any>;

describe('OpenAPI Loader: example_api7', () => {
  // Set up the schema first and run example API servers
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api7', {
      fetch: exampleApi7.fetch as any,
      endpoint: `http://127.0.0.1:3000/api`,
      source: './fixtures/example_oas7.json',
      cwd: __dirname,
      pubsub,
    });

    yogaServer = createYoga({
      schema: createdSchema,
      context: { pubsub },
      maskedErrors: false,
      logging: !!process.env.DEBUG,
    });
  });

  it('Receive data from the subscription after creating a new instance', async () => {
    expect.assertions(2);
    const userName = 'Carlos';
    const deviceName = 'Bot';

    const subscriptionOperation = /* GraphQL */ `
      subscription watchDevice($method: String!, $userName: String!) {
        devicesEventListener(method: $method, userName: $userName) {
          name
          status
        }
      }
    `;

    const mutationOperation = /* GraphQL */ `
      mutation triggerEvent($deviceInput: Device_Input!) {
        createDevice(input: $deviceInput) {
          ... on Device {
            name
            userName
            status
          }
        }
      }
    `;
    const endpoint = `http://127.0.0.1:4000/graphql`;
    const url = new URL(endpoint);

    url.searchParams.append('query', subscriptionOperation);
    url.searchParams.append(
      'variables',
      JSON.stringify({
        method: 'POST',
        userName,
      }),
    );

    setTimeout(async () => {
      const response = await yogaServer.fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: mutationOperation,
          variables: {
            deviceInput: {
              name: `${deviceName}`,
              userName: `${userName}`,
              status: false,
            },
          },
        }),
      });
      const result: any = await response.json();
      expect(result.errors).toBeFalsy();
    }, 300);

    const response = await yogaServer.fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
    });

    for await (const chunk of response.body) {
      const data = Buffer.from(chunk).toString('utf-8').trim();
      if (data.includes('data: ')) {
        expect(data).toContain(
          `data: ${JSON.stringify({
            data: {
              devicesEventListener: {
                name: deviceName,
                status: false,
              },
            },
          })}`,
        );
        break;
      }
    }
  });
});
