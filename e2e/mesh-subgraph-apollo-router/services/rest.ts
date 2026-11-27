import { createServer } from 'node:http';
import { createRouter, Response } from 'fets';
import { Opts } from '@e2e/opts';

const products: Record<string, { id: string; name: string }> = {
  '1': { id: '1', name: 'Mesh Widget' },
  '2': { id: '2', name: 'Router Gadget' },
};

const app = createRouter().route({
  method: 'GET',
  path: '/products/:id',
  handler(req) {
    const product = products[req.params.id];
    if (!product) {
      return Response.json({ error: 'not found' }, { status: 404 });
    }
    return Response.json(product);
  },
});

const port = Opts(process.argv).getServicePort('rest', true);

createServer(app).listen(port, '127.0.0.1', () => {
  console.log(`REST products at http://127.0.0.1:${port}`);
});
