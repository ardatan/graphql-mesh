import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';

const graphqlEndpoint = '/api/v1/web/guest/mesh/swapi/graphql';

const httpHandler = createGatewayRuntime({
  http: {
    endpoint: 'https://swapi-graphql.netlify.app/.netlify/functions/index',
  },
  graphqlEndpoint,
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

// Local `yarn dev`: listen so the OpenWhisk handler path can be exercised without deploy.
const isMain =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT || 4000);
  createServer(httpHandler).listen(port, () => {
    console.log(`OpenWhisk Mesh example listening at http://localhost:${port}${graphqlEndpoint}`);
  });
}
