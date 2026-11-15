import { createServer } from 'http';
import { createRouter, Response } from 'fets';
import { Opts } from '@e2e/opts';

const products: Record<string, { id: string; name: string; price: number }> = {
  p1: { id: 'p1', name: 'GraphQL Mug', price: 12.5 },
  p2: { id: 'p2', name: 'Federation Tee', price: 24 },
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

const port = Opts(process.argv).getServicePort('products');

createServer(app).listen(port, () => {
  console.log(`Products API at http://localhost:${port}`);
});
