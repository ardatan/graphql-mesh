import express from 'express';
import { ThriftServerExpress } from '@creditkarma/thrift-server-express';
import { Opts } from '@e2e/opts';
import { Calculator } from './__generated__';

const opts = Opts(process.argv);

const serviceHandlers: Calculator.IHandler<express.Request> = {
  add(request): number {
    // Trigger TApplicationException path for e2e (JSON @connect isSuccess/errors).
    if (request.left === -1) {
      throw new Error('left must not be -1');
    }
    return request.left + request.right;
  },
  subtract(left: number, right: number): number {
    return left - right;
  },
};

const processor = new Calculator.Processor(serviceHandlers);

const app = express();

app.use(
  '/thrift',
  express.raw({ type: () => true }),
  ThriftServerExpress({
    serviceName: 'calculator-service',
    handler: processor,
    protocol: 'binary',
  }),
);

app.use(
  '/thrift-json',
  express.raw({ type: () => true }),
  ThriftServerExpress({
    serviceName: 'calculator-service',
    handler: processor,
    protocol: 'json',
  }),
);

const port = opts.getServicePort('calculator');

export default app.listen(port, () => {
  console.log(`Calculator service listening on http://localhost:${port}`);
  console.log(`  binary: /thrift`);
  console.log(`  json:   /thrift-json`);
});
