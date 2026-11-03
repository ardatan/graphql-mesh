import fastify from 'fastify';
import { createBuiltMeshHTTPHandler } from '../.mesh';

export const app = fastify();

const meshHttp = createBuiltMeshHTTPHandler();

app.route({
  url: '/graphql',
  method: ['GET', 'POST', 'OPTIONS'],
  // Fastify accepts the WHATWG Response returned by the adapter directly.
  handler: (req, reply) =>
    meshHttp.handleNodeRequestAndResponse(req, reply, {
      req,
      reply,
    }),
});
