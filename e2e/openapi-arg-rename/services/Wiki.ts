import fastify from 'fastify';
import { Args } from '@e2e/args';

const args = Args(process.argv);

const app = fastify();

app.post('/good', function (request, reply) {
  reply.send({
    apple: JSON.stringify(request.body),
  });
});

app.post('/bad', function (request, reply) {
  reply.send({
    apple: JSON.stringify(request.body),
  });
});

app.listen({ port: args.getServicePort('Wiki') });
