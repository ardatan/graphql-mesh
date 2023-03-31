import { createServer } from 'http';
import { router } from './router';

createServer(router).listen(3000, () => {
  console.log('Listening on port 3000');
});
