import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Opts } from '@e2e/opts';

const metadata = readFileSync(join(process.cwd(), 'fixtures/metadata.xml'), 'utf8');

const me = {
  id: 'user-ada',
  displayName: 'Ada Lovelace',
  mail: 'ada@example.com',
};

const port = Opts(process.argv).getServicePort('Graph');

createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'GET' && path.endsWith('/$metadata')) {
    res.writeHead(200, { 'content-type': 'application/xml' });
    res.end(metadata);
    return;
  }

  if (req.method === 'GET' && path.endsWith('/me')) {
    const auth = req.headers.authorization || '';
    if (!auth.toLowerCase().startsWith('bearer ')) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Unauthorized' } }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(me));
    return;
  }

  const userMatch = path.match(/\/users\/([^/]+)$/);
  if (req.method === 'GET' && userMatch) {
    const id = decodeURIComponent(userMatch[1]);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ...me, id }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: { message: `Not found: ${path}` } }));
}).listen(port, () => {
  console.log(`MS Graph mock at http://127.0.0.1:${port}`);
});
