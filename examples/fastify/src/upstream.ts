import fastify from 'fastify';

export const upstream = fastify();

upstream.route({
  method: ['GET', 'POST'],
  url: '/pet/:petId',
  async handler(request, reply) {
    return reply.status(200).send({
      "id": "0fc9111f-570d-4ebe-a72e-ff4eb274bc65",
    });
  },
});
