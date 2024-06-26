import { join } from 'path';
import fastify from 'fastify';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';

export const app = fastify();

const meshHttp = createServeRuntime({
  supergraph: join(__dirname, '..', 'supergraph.graphql'),
});

app.route({
  url: '/graphql',
  method: ['GET', 'POST', 'OPTIONS'],
  async handler(req, reply) {
    // Second parameter adds Fastify's `req` and `reply` to the GraphQL Context
    const response = await meshHttp.handleNodeRequest(req, {
      req,
      reply,
    });

    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    reply.status(response.status);

    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      reply.send(value);
    }

    return reply;
  },
});
