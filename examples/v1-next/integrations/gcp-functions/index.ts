import type { IncomingMessage, ServerResponse } from 'node:http';
import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';

const functionBasePath = '/mesh';

const meshHTTP = createGatewayRuntime({
  graphqlEndpoint: functionBasePath,
});

export function mesh(req: IncomingMessage, res: ServerResponse) {
  // GCP doesn't expose the full path so we need to patch it
  req.url = functionBasePath + req.url;
  return meshHTTP(req, res);
}
