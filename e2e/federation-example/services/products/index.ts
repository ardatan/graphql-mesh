import { startStandaloneServer } from '@apollo/server/standalone';
import { Opts } from '@e2e/opts';
import { server } from './server';

const opts = Opts(process.argv);

startStandaloneServer(server, { listen: { port: opts.getServicePort('products') } }).catch(err => {
  console.error(err);
  process.exit(1);
});
