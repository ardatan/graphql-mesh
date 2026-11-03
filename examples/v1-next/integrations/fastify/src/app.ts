import { join } from 'path';
import fastify from 'fastify';
import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';

export const app = fastify();

const meshHttp = createGatewayRuntime({
  supergraph: join(__dirname, '..', 'supergraph.graphql'),
});

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
