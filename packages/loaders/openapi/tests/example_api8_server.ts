/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-extraneous-dependencies */

import { createRouter, Response } from '@whatwg-node/router';
import { createServer, Server } from 'http';

export function startServer(): Promise<Server> {
  const app = createRouter({
    base: '/api',
  });
  app.get(
    '/user',
    () =>
      new Response(null, {
        status: 404,
      }),
  );

  const server = createServer(app);
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      resolve(server);
    });
  });
}
