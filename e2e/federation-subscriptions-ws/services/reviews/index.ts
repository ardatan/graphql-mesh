import { Args } from '@e2e/args';
import { start } from './server';

const args = Args(process.argv);

start(args.getServicePort('reviews')).catch(err => {
  console.error(err);
  process.exit(1);
});
