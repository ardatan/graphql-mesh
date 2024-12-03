const { Opts } = require('@e2e/opts');
const express = require('express');
const app = express();

const opts = Opts(process.argv);

const port = opts.getServicePort('OASService');

app.use(express.json());

const products = [
  {
    id: 1,
    name: 'Laptop',
    price: 1200,
    supplierId: 11,
    warranty: '01-01-2027',
    _links: {
      self: { href: 'http://localhost:3000/products/1' },
      supplier: { href: 'http://localhost:3000/suppliers/11' },
    },
    _type: 'ELECTRONICS',
  },
  {
    id: 2,
    name: 'Phone',
    price: 800,
    supplierId: 12,
    warranty: '01-01-2025',
    _links: {
      self: { href: 'http://localhost:3000/products/2' },
      supplier: { href: 'http://localhost:3000/suppliers/12' },
    },
    _type: 'ELECTRONICS',
  },
];

const suppliers = [
  {
    id: 11,
    name: 'Tech Supplier Inc.',
  },
  {
    id: 12,
    name: 'Gadget Suppliers Ltd.',
  },
];

app.get('/products', (req, res) => {
  res.json(products);
});

app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id, 10));
  if (product) {
    res.json(product);
  } else {
    res.status(404).send('Product not found');
  }
});

app.get('/suppliers', (req, res) => {
  res.json(suppliers);
});

app.get('/suppliers/:id', (req, res) => {
  const supplier = suppliers.find(s => s.id === parseInt(req.params.id, 10));
  if (supplier) {
    res.json(supplier);
  } else {
    res.status(404).send('Supplier not found');
  }
});

const server = app.listen(port, () => {
  console.log(`HATEOAS server running at http://localhost:${port}`);
});

module.exports = server;
