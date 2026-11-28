import { startStandaloneServer } from '@apollo/server/standalone';
import { Opts } from '@internal/testing';
import { server } from './server';

const opts = Opts(process.argv);

startStandaloneServer(server, {
  listen: { port: opts.getServicePort('accounts') },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
