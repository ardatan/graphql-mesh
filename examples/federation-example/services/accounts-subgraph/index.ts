import { accountsSubgraphServer } from './server';

accountsSubgraphServer().catch(error => {
  console.error(error);
  process.exit(1);
});
