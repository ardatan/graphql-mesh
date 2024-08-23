import { createServer } from 'http';
import { Opts } from '@e2e/opts';

const HIVE_CDN_TOKEN = 'VERY_SECRET_TOKEN';

export const documentStore = {
  foo: /* GraphQL */ `
    query Foo {
      foo
    }
  `,
  bar: /* GraphQL */ `
    query Bar {
      bar
    }
  `,
};

createServer((req, res) => {
  if (req.url.startsWith('/apps')) {
    const [, , documentId] = req.url.split('/');
    if (req.headers['x-hive-cdn-key'] !== HIVE_CDN_TOKEN) {
      res.statusCode = 401;
      res.end('Unauthorized');
      return;
    }
    if (documentStore[documentId]) {
      res.end(documentStore[documentId]);
      return;
    }
  }
  res.statusCode = 404;
  res.end('Not Found');
}).listen(Opts(process.argv).getServicePort('hive-cdn'), () => {
  console.log('Hive CDN service is running');
});
