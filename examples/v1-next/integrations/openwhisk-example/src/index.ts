import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';

const httpHandler = createGatewayRuntime({
  http: {
    endpoint: 'https://swapi-graphql.netlify.app/.netlify/functions/index',
  },
  graphqlEndpoint: '/api/v1/web/guest/mesh/swapi/graphql',
});

export async function main(params) {
  const response = await httpHandler.fetch(
    `http://localhost/api/v1/web/guest/mesh/swapi${params.__ow_path}`,
    {
      method: params.__ow_method,
      headers: params.__ow_headers,
      body: params.__ow_body ? Buffer.from(params.__ow_body, 'base64') : undefined,
    },
    params,
  );

  const headers = Object.fromEntries(response.headers.entries());

  const body = await (headers['content-type'].includes('json') ? response.json() : response.text());

  return {
    statusCode: response.status,
    body,
    headers,
  };
}
