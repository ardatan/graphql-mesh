import { createServer } from 'http';
import { createRouter, Response } from 'fets';
import { Opts } from '@e2e/opts';

const customers: Record<string, { id: string; name: string }> = {
  c1: { id: 'c1', name: 'Ada Lovelace' },
  c2: { id: 'c2', name: 'Grace Hopper' },
};

const invoices: Record<string, { id: string; total: number; customerId: string }> = {
  inv1: { id: 'inv1', total: 42.5, customerId: 'c1' },
  inv2: { id: 'inv2', total: 99, customerId: 'c2' },
};

const app = createRouter()
  .route({
    method: 'GET',
    path: '/customers/:id',
    handler(req) {
      const customer = customers[req.params.id];
      if (!customer) {
        return Response.json({ error: 'not found' }, { status: 404 });
      }
      return Response.json(customer);
    },
  })
  .route({
    method: 'GET',
    path: '/invoices/:id',
    handler(req) {
      const invoice = invoices[req.params.id];
      if (!invoice) {
        return Response.json({ error: 'not found' }, { status: 404 });
      }
      // Intentionally omit nested `customer` — only FK `customerId`.
      // Entity stub + getCustomer connector fills `customer { id name }`.
      return Response.json(invoice);
    },
  });

const port = Opts(process.argv).getServicePort('API');

createServer(app).listen(port, () => {
  console.log(`Entity-stubs API at http://localhost:${port}`);
});
