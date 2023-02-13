import { productsServer } from './server';

productsServer().catch(error => {
  console.error(error);
  process.exit(1);
});
