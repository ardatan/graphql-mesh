/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-extraneous-dependencies */
import express from 'express';
import http from 'http';
import multer from 'multer';

let server: http.Server; // holds server object for shutdown

const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Starts the server at the given port
 */
export function startServer() {
  const app = express();

  app.post('/api/upload', upload.any(), (req, res) => {
    res.json({
      name: req.files?.[0]?.originalname,
      content: req.files?.[0]?.buffer.toString('utf8'),
    });
  });

  return new Promise<http.Server>(resolve => {
    server = app.listen(0, () => {
      resolve(server);
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
