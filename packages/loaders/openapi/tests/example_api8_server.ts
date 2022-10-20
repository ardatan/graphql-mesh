/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-extraneous-dependencies */

import { createServer, Server } from 'http';
import { createServerAdapter } from '@whatwg-node/server';
import { Router } from 'itty-router';
import { Response } from '@whatwg-node/fetch';

export function startServer(): Promise<Server> {
  const app = createServerAdapter(
    Router({
      base: '/api',
    })
  );
  app.get(
    '/user',
    () =>
      new Response(null, {
        status: 404,
      })
  );

  const server = createServer(app);
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      resolve(server);
    });
  });
}
