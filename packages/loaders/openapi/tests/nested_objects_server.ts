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

  app.get('/collections/CHECKOUT_SUPER_PRODUCT/documents/search', (req, res) => {
    res.send({
      hits: [
        {
          document: 'Something goes here',
        },
      ],
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
  startServer(3009);
}
