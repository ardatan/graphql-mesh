/* eslint-disable import/no-nodejs-modules */
/* eslint-disable no-unreachable-loop */
import { createYoga } from 'graphql-yoga';
import { createServer, Server } from 'http';
import { AbortController, fetch } from '@whatwg-node/fetch';
import { GraphQLSchema } from 'graphql';

import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';
import { startServer, stopServer, pubsub } from './example_api7_server.js';
import { AddressInfo } from 'net';

let createdSchema: GraphQLSchema;

let graphqlPort: number;
let apiPort: number;

let yogaServer: Server;

describe('OpenAPI Loader: example_api7', () => {
  // Set up the schema first and run example API servers
  beforeAll(async () => {
    const apiServer = await startServer();
    apiPort = (apiServer.address() as AddressInfo).port;

    createdSchema = await loadGraphQLSchemaFromOpenAPI('example_api7', {
      fetch,
      baseUrl: `http://127.0.0.1:${apiPort}/api`,
      source: './fixtures/example_oas7.json',
      cwd: __dirname,
      pubsub,
    });

    const yoga = createYoga({
      schema: createdSchema,
      context: { pubsub },
      maskedErrors: false,
      logging: false,
    });

    yogaServer = createServer(yoga);

    await new Promise<void>(resolve => yogaServer.listen(0, resolve));

    graphqlPort = (yogaServer.address() as AddressInfo).port;
  });

  afterAll(() => Promise.all([new Promise(resolve => yogaServer.close(resolve)), stopServer()]));

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
    const baseUrl = `http://127.0.0.1:${graphqlPort}/graphql`;
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
      const result: any = await response.json();
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
