import http from 'node:http';
import { Opts } from '@e2e/opts';

const opts = Opts(process.argv);

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/good') {
    return res.setHeader('content-type', 'application/json').end(JSON.stringify({ apple: 'good' }));
  }
  if (u.pathname === '/bad') {
    return res.setHeader('content-type', 'application/json').end(JSON.stringify({ apple: 'bad' }));
  }
  return res.writeHead(404).end();
});

server.listen(opts.getServicePort('Wiki'));
