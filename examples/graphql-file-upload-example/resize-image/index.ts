import { startServer } from './server';

startServer().then(() => {
  console.info(`ResizeImage GraphQL API listening on 3002`);
});
