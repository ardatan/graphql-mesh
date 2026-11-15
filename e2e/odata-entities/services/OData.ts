import { readFileSync } from 'fs';
import { createServer } from 'http';
import { join } from 'path';
import { Opts } from '@e2e/opts';

const metadata = readFileSync(join(process.cwd(), 'fixtures/metadata.xml'), 'utf8');

const airlines: Record<string, { AirlineCode: string; Name: string }> = {
  AA: { AirlineCode: 'AA', Name: 'American Airlines' },
  UA: { AirlineCode: 'UA', Name: 'United Airlines' },
};

const port = Opts(process.argv).getServicePort('OData');

createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  res.setHeader('Content-Type', 'application/json;odata.metadata=minimal');

  if (path === '/$metadata' || path.endsWith('/$metadata')) {
    res.setHeader('Content-Type', 'application/xml');
    res.end(metadata);
    return;
  }

  if (path === '/Airlines') {
    res.end(JSON.stringify({ value: Object.values(airlines) }));
    return;
  }

  const byCode = path.match(/^\/Airlines\/([^/]+)$/);
  if (byCode) {
    const code = decodeURIComponent(byCode[1]);
    const airline = airlines[code];
    if (!airline) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: { message: 'not found' } }));
      return;
    }
    res.end(
      JSON.stringify({
        '@odata.id': `http://127.0.0.1:${port}/Airlines/${code}`,
        ...airline,
      }),
    );
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: { message: `no route ${path}` } }));
}).listen(port, '127.0.0.1', () => {
  console.log(`OData Airlines mock at http://127.0.0.1:${port}`);
});
