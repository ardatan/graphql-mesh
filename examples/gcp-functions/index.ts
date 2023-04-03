import type { IncomingMessage, ServerResponse } from 'node:http';
import { createBuiltMeshHTTPHandler } from './.mesh';

const meshHTTP = createBuiltMeshHTTPHandler();

export function mesh(req: IncomingMessage, res: ServerResponse) {
  // GCP doesn't expose the full path so we need to patch it
  req.url = '/mesh' + req.url;
  return meshHTTP(req, res);
}
