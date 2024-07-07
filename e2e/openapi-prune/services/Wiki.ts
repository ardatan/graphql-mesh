import fastify from 'fastify';
import { Args } from '@e2e/args';

const args = Args(process.argv);

const app = fastify();

app.post('/main', function (request, reply) {
  reply.send({
    apple: 'correct',
  });
});

app.get('/main', function (request, reply) {
  reply.send({
    apple: 'bad',
  });
});
app.listen({ port: args.getServicePort('Wiki') });
