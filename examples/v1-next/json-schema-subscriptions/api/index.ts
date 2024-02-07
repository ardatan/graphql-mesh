import { createServer } from 'http';
import { createApi } from './app';

createServer(createApi().app).listen(4002, () => {
  console.log('Remote API listening on port 4002');
});
