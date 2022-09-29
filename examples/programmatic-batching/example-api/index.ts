import { createServer } from 'http';
import { createApp } from './app';

createServer(createApp()).listen(4001, () => {
  console.log('Listening on port 4001');
});
