/* eslint-disable import/no-nodejs-modules */

/* eslint-disable import/no-extraneous-dependencies */
import { createRouter, Response } from 'fets';

export const exampleApi8 = createRouter({
  base: '/api',
}).route({
  method: 'GET',
  path: '/user',
  handler: () =>
    new Response(null, {
      status: 404,
    }),
});
