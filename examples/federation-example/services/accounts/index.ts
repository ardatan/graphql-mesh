import { accountsServer } from './server';

accountsServer().catch(error => {
  console.error(error);
  process.exit(1);
});
