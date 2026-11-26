import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

/** Resolve this file under both ESM (`import.meta.url`) and CJS (`__filename` via tsx). */
function currentModulePath(): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return fileURLToPath(import.meta.url);
    }
  } catch {
    // import.meta may be an empty object under some CJS compilations
  }
  // CJS: `__filename` is module-local (not on globalThis). Read via Function so the
  // source stays valid when esbuild bundles this file as the OpenWhisk action.
  try {
    // eslint-disable-next-line no-new-func
    const cjsFilename = new Function(
      'return typeof __filename === "string" ? __filename : undefined',
    )();
    if (typeof cjsFilename === 'string') {
      return cjsFilename;
    }
  } catch {
    // ignore
  }
  return undefined;
}

// Local `yarn dev` (`tsx src/index.ts`): listen under ESM or CJS. Deployed
// `dist/index.js` must not start a listener even if required as main.
const entry = process.argv[1];
const self = currentModulePath();
const isMain =
  typeof entry === 'string' &&
  self != null &&
  path.resolve(entry) === path.resolve(self) &&
  /[/\\]src[/\\]index\.[cm]?[jt]s$/.test(self);
if (isMain) {
  const port = Number(process.env.PORT || 4000);
  createServer(httpHandler).listen(port, () => {
    console.log(`OpenWhisk Mesh example listening at http://localhost:${port}${graphqlEndpoint}`);
  });
}
