import { Opts } from '@e2e/opts';
import { start } from './server';

const opts = Opts(process.argv);

start(opts.getServicePort('reviews', true)).catch(err => {
  console.error(err);
  process.exit(1);
});
