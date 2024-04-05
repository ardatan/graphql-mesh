// eslint-disable-next-line import/no-extraneous-dependencies
import { createRouter, Response } from 'fets';

export const nestedObjectsApi = createRouter().route({
  method: 'GET',
  path: '/collections/CHECKOUT_SUPER_PRODUCT/documents/search',
  handler: req => {
    return Response.json({
      hits: [
        {
          document: 'Something goes here',
        },
      ],
    });
  },
});
