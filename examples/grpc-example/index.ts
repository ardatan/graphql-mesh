import { startServer } from './start-server';

startServer(1000, true).catch(console.error);

process.on('uncaughtException', err => {
  console.error(`process on uncaughtException error: ${err}`);
});

process.on('unhandledRejection', err => {
  console.error(`process on unhandledRejection error: ${err}`);
});
