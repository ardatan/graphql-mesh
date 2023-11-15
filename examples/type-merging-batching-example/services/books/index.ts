import { createServer } from 'http';
import { booksYoga } from './yoga';

createServer(booksYoga).listen(4002, () => {
  console.log('Books service listening on port 4002');
});
