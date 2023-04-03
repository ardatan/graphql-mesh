/* eslint-disable import/no-nodejs-modules */

/* eslint-disable import/no-extraneous-dependencies */
import { createRouter, Response } from '@whatwg-node/router';

export const exampleApi8 = createRouter({
  base: '/api',
});
exampleApi8.get(
  '/user',
  () =>
    new Response(null, {
      status: 404,
    }),
);
