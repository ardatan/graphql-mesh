import { createBuiltMeshHTTPHandler } from '../.mesh';

const httpHandler = createBuiltMeshHTTPHandler();

export const main = async function (params) {
  const response = await httpHandler.fetch(
    `http://localhost/api/v1/web/guest/mesh/swapi${params.__ow_path}`,
    {
      method: params.__ow_method,
      headers: params.__ow_headers,
      body: params.__ow_body ? Buffer.from(params.__ow_body, 'base64') : undefined,
    },
    params
  );

  const headers = {};

  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const body = await (headers['content-type'].includes('json') ? response.json() : response.text());

  return {
    statusCode: response.status,
    body,
    headers,
  };
};
