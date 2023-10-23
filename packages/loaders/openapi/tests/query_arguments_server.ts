/* eslint-disable import/no-nodejs-modules */

/* eslint-disable import/no-extraneous-dependencies */
// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
import { createRouter, Response } from 'fets';

const data = [{ id: 1 }, { id: 2 }, { id: 3 }];

export const queryArgumentsApi = createRouter().route({
  method: 'GET',
  path: '/todos',
  handler: req => {
    const ids = (req.query?.id__in ?? []) as unknown as Array<number>;
    return Response.json(data.filter(x => ids.includes(x.id)));
  },
});
