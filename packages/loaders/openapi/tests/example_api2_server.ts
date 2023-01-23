// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
// eslint-disable-next-line import/no-extraneous-dependencies
import { createRouter, Response } from '@whatwg-node/router';

export const exampleApi2 = createRouter();
exampleApi2.get('/api/user', () => {
  return new Response(JSON.stringify({ name: 'Arlene L McMahon' }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});

exampleApi2.get('/api/user2', () => {
  return new Response(JSON.stringify({ name: 'William B Ropp' }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});
