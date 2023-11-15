import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';

const functionBasePath = '/mesh';

const meshHTTP = createServeRuntime({
  graphqlEndpoint: functionBasePath,
});

export function mesh(req: IncomingMessage, res: ServerResponse) {
  // GCP doesn't expose the full path so we need to patch it
  req.url = functionBasePath + req.url;
  return meshHTTP(req, res);
}
