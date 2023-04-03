// eslint-disable-next-line import/no-extraneous-dependencies
import { createRouter, Response } from '@whatwg-node/router';

export const nestedObjectsApi = createRouter();

nestedObjectsApi.get('/collections/CHECKOUT_SUPER_PRODUCT/documents/search', req => {
  return new Response(
    JSON.stringify({
      hits: [
        {
          document: 'Something goes here',
        },
      ],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
});
