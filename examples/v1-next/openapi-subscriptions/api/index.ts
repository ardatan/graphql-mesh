import { createServer } from 'http';
import { createApp } from './app';

const { app, dispose } = createApp();

const server = createServer(app).listen(4001, () => {
  console.info('API Server Listening on 4001');
});

server.once('close', () => {
  dispose();
});
