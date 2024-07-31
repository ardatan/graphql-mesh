import { startStandaloneServer } from '@apollo/server/standalone';
import { Args } from '@e2e/args';
import { server } from './server';

const args = Args(process.argv);

startStandaloneServer(server, { listen: { port: args.getServicePort('accounts') } }).catch(err => {
  console.error(err);
  process.exit(1);
});
