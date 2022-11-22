/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-extraneous-dependencies */
// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import { Request as IttyRequest, Router } from 'itty-router';
import { createServerAdapter } from '@whatwg-node/server';
import { createServer, Server } from 'http';
import { withCookies, withParams } from 'itty-router-extras';
import { Request, Response } from '@whatwg-node/fetch';

/**
 * Starts the server at the given port
 */
export function getServer() {
  const app = createServerAdapter(Router(), Request);

  app.all('*', withCookies, withParams);

  const data = [{ id: 1 }, { id: 2 }, { id: 3 }];

  app.get('/todos', (req: Request & IttyRequest, res: Response) => {
    const ids = req.query.id__in as unknown as Array<number>;

    return new Response(JSON.stringify(data.filter(x => ids.includes(x.id))), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  const server = createServer(app);
  return new Promise<Server>(resolve => {
    server.listen(53919, () => {
      resolve(server);
    });
  });
}
