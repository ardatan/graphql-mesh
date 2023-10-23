// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
// eslint-disable-next-line import/no-extraneous-dependencies
import { createRouter, Response } from 'fets';

export const exampleApi2 = createRouter()
  .route({
    method: 'GET',
    path: '/api/user',
    handler: () => Response.json({ name: 'Arlene L McMahon' }),
  })
  .route({
    method: 'GET',
    path: '/api/user2',
    handler: () => Response.json({ name: 'William B Ropp' }),
  });
