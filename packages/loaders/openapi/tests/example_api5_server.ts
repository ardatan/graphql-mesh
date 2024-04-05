// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
// eslint-disable-next-line import/no-extraneous-dependencies
import { createRouter, Response } from 'fets';

export const exampleApi5 = createRouter()
  .route({
    method: 'GET',
    path: '/api/o_d_d___n_a_m_e',
    handler: () => Response.json({ data: 'odd name' }),
  })
  .route({
    method: 'GET',
    path: '/api/w-e-i-r-d___n-a-m-e',
    handler: () => Response.json({ data: 'weird name' }),
  })
  .route({
    method: 'GET',
    /**
     * Cannot use f-u-n-k-y___p-a-r-a-m-e-t-e-r (like in the OAS) as it is not
     * allowed by Express.js routing
     *
     * "The name of route parameters must be made up of "word characters"
     * ([A-Za-z0-9_])."
     */
    path: '/api/w-e-i-r-d___n-a-m-e2/:funky___parameter',
    handler: req => Response.json({ data: `weird name 2 param: ${req.params.funky___parameter}` }),
  })
  .route({
    method: 'GET',
    path: '/api/w-e-i-r-d___n-a-m-e3/:funky___parameter',
    handler: req => Response.json({ data: `weird name 3 param: ${req.params.funky___parameter}` }),
  })
  .route({
    method: 'GET',
    path: '/api/getEnum',
    handler: () => Response.json({ data: 'a-m-b-e-r' }),
  })
  .route({
    method: 'GET',
    path: '/api/getNumericalEnum',
    handler: () => Response.json({ data: 3 }),
  })
  .route({
    method: 'GET',
    path: '/api/getObjectEnum',
    handler: () => Response.json({ data: { value: 'a-m-b-e-r' } }),
  });
