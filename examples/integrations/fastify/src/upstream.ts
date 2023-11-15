import fastify from 'fastify';

export const upstream = fastify();

upstream.route({
  method: ['GET', 'POST'],
  url: '/pet/:petId',
  handler(request, reply) {
    const { petId } = request.params as { petId: string };

    if (petId === 'pet200') {
      return reply.status(200).send({ name: 'Bob' });
    }

    return reply.status(500).send({ error: `Error` });
  },
});
