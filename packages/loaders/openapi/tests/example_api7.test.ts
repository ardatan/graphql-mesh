/* eslint-disable no-unreachable-loop */
import { createServer, YogaNodeServerInstance } from '@graphql-yoga/node';
import { AbortController, fetch } from '@whatwg-node/fetch';
import { GraphQLSchema } from 'graphql';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';
import { startServer, stopServer, pubsub } from './example_api7_server';

let createdSchema: GraphQLSchema;
const GRAPHQL_PORT = 3009;
const API_PORT = 3008;

let yogaServer: YogaNodeServerInstance<any, any, any>;

describe('OpenAPI Loader: example_api7', () => {
  // Set up the schema first and run example API servers
  beforeAll(async () => {
    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api7', {
      fetch,
      baseUrl: `http://localhost:${API_PORT}/api`,
      source: './fixtures/example_oas7.json',
      cwd: __dirname,
      pubsub,
    });

    yogaServer = createServer({
      schema: createdSchema,
      port: GRAPHQL_PORT,
      context: { pubsub },
      maskedErrors: false,
      logging: false,
    });

    await Promise.all([yogaServer.start(), startServer(API_PORT)]);
  });

  afterAll(async () => {
    await Promise.all([yogaServer.stop(), stopServer()]);
  });

  it('Receive data from the subscription after creating a new instance', async () => {
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
    const baseUrl = `http://localhost:${GRAPHQL_PORT}/graphql`;
    const url = new URL(baseUrl);

    url.searchParams.append('query', subscriptionOperation);
    url.searchParams.append(
      'variables',
      JSON.stringify({
        method: 'POST',
        userName,
      })
    );

    setTimeout(async () => {
      const response = await fetch(baseUrl, {
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
      const result = await response.json();
      expect(result.errors).toBeFalsy();
    }, 300);

    const abortCtrl = new AbortController();

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
      signal: abortCtrl.signal,
    });

    for await (const chunk of response.body) {
      const data = Buffer.from(chunk).toString('utf-8');
      expect(data.trim()).toBe(
        `data: ${JSON.stringify({
          data: {
            devicesEventListener: {
              name: deviceName,
              status: false,
            },
          },
        })}`
      );
      break;
    }

    abortCtrl.abort();
  });
});
