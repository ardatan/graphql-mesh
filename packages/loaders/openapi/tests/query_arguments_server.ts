/* eslint-disable import/no-nodejs-modules */

/* eslint-disable import/no-extraneous-dependencies */
// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
import { createRouter, Response } from '@whatwg-node/router';

/**
 * Starts the server at the given port
 */

export const queryArgumentsApi = createRouter();

const data = [{ id: 1 }, { id: 2 }, { id: 3 }];

queryArgumentsApi.get('/todos', req => {
  const ids = (req.query?.id__in ?? []) as unknown as Array<number>;

  return new Response(JSON.stringify(data.filter(x => ids.includes(x.id))), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
});
