// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import express from 'express';
import * as bodyParser from 'body-parser';
import { Server } from 'http';

let server: Server; // holds server object for shutdown

/**
 * Starts the server at the given port
 */
export function startServer(PORT: number) {
  const app = express();

  app.use(bodyParser.json());

  app.get('/api/o_d_d___n_a_m_e', (req, res) => {
    res.send({
      data: 'odd name',
    });
  });

  app.get('/api/w-e-i-r-d___n-a-m-e', (req, res) => {
    res.send({
      data: 'weird name',
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
  app.get('/api/w-e-i-r-d___n-a-m-e2/:funky___parameter', (req, res) => {
    res.send({
      data: `weird name 2 param: ${req.params.funky___parameter}`,
    });
  });

  app.get('/api/w-e-i-r-d___n-a-m-e3/:funky___parameter', (req, res) => {
    res.send({
      data: `weird name 3 param: ${req.params.funky___parameter}`,
    });
  });

  app.get('/api/getEnum', (req, res) => {
    res.send({
      data: 'a-m-b-e-r',
    });
  });

  app.get('/api/getNumericalEnum', (req, res) => {
    res.send({
      data: 3,
    });
  });

  app.get('/api/getObjectEnum', (req, res) => {
    res.send({
      data: {
        hello: 'world',
      },
    });
  });

  return new Promise(resolve => {
    server = app.listen(PORT, resolve as () => void);
  });
}

/**
 * Stops server.
 */
export function stopServer() {
  return new Promise(resolve => {
    server.close(resolve);
  });
}

// if run from command line, start server:
if (require.main === module) {
  startServer(3005).catch(console.error);
}
