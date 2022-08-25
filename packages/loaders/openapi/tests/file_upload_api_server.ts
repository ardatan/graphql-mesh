import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';

let server: http.Server; // holds server object for shutdown

/**
 * Starts the server at the given port
 */
export function startServer(PORT: number | string) {
  const app = express();

  app.use(bodyParser.json());

  app.post('/api/upload', (req, res) => {
    res.json({
      id: '1234567098',
      url: 'https://some-random-url.domain/assets/upload-file.ext',
    });
  });

  return new Promise<void>(resolve => {
    server = app.listen(PORT, () => {
      resolve();
    });
  });
}

/**
 * Stops server.
 */
export function stopServer() {
  return new Promise<void>(resolve => {
    server.close(() => {
      resolve();
    });
  });
}

// If run from command line, start server:
if (require.main === module) {
  // eslint-disable-next-line no-void
  void (async () => startServer(3002))();
}
