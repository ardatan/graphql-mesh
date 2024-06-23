import { createServer } from 'http';
import { Args } from '@e2e/args';
import { server } from './server';

const args = Args(process.argv);

const httpServer = createServer(server).listen(args.getServicePort('accounts'));

httpServer.once('error', err => {
  console.error(err);
  process.exit(1);
});
