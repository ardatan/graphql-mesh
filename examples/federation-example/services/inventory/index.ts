import { inventoryServer } from './server';

inventoryServer().catch(error => {
  console.error(error);
  process.exit(1);
});
