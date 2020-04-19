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

  app.get('/api/user', (req, res) => {
    console.log(req.method, req.path);
    res.send({
      name: 'Arlene L McMahon',
    });
  });

  app.get('/api/user2', (req, res) => {
    console.log(req.method, req.path);
    res.send({
      name: 'William B Ropp',
    });
  });

  return new Promise(resolve => {
    server = app.listen(PORT, () => {
      console.log(`Example API accessible on port ${PORT}`);
      resolve();
    });
  });
}

/**
 * Stops server.
 */
export function stopServer() {
  return new Promise(resolve => {
    server.close(() => {
      console.log(`Stopped API server`);
      resolve();
    });
  });
}

// if run from command line, start server:
if (require.main === module) {
  startServer(3002);
}
