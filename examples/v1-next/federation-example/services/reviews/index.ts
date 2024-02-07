import { reviewsServer } from './server';

reviewsServer().catch(error => {
  console.error(error);
  process.exit(1);
});
