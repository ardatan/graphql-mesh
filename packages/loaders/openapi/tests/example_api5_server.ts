// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
// eslint-disable-next-line import/no-extraneous-dependencies
import { createRouter, Response } from '@whatwg-node/router';

export const exampleApi5 = createRouter();

exampleApi5.get('/api/o_d_d___n_a_m_e', req => {
  return new Response(JSON.stringify({ data: 'odd name' }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi5.get('/api/w-e-i-r-d___n-a-m-e', req => {
  return new Response(JSON.stringify({ data: 'weird name' }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

/**
 * Cannot use f-u-n-k-y___p-a-r-a-m-e-t-e-r (like in the OAS) as it is not
 * allowed by Express.js routing
 *
 * "The name of route parameters must be made up of "word characters"
 * ([A-Za-z0-9_])."
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
exampleApi5.get('/api/w-e-i-r-d___n-a-m-e2/:funky___parameter', req => {
  return new Response(
    JSON.stringify({ data: `weird name 2 param: ${req.params.funky___parameter}` }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
});

exampleApi5.get('/api/w-e-i-r-d___n-a-m-e3/:funky___parameter', req => {
  return new Response(
    JSON.stringify({ data: `weird name 3 param: ${req.params.funky___parameter}` }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
});

exampleApi5.get('/api/getEnum', req => {
  return new Response(JSON.stringify({ data: 'a-m-b-e-r' }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi5.get('/api/getNumericalEnum', req => {
  return new Response(JSON.stringify({ data: 3 }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi5.get('/api/getObjectEnum', req => {
  return new Response(JSON.stringify({ data: { value: 'a-m-b-e-r' } }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});
