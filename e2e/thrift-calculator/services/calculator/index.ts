import * as express from 'express';
import { createThriftServer } from '@creditkarma/thrift-server-express';
import { Opts } from '@e2e/opts';
import { Calculator } from './__generated__';

const opts = Opts(process.argv);

const serviceHandlers: Calculator.IHandler<express.Request> = {
  add(request): number {
    return request.left + request.right;
  },
  subtract(left: number, right: number): number {
    return left - right;
  },
};

const app: express.Application = createThriftServer({
  path: '/thrift',
  thriftOptions: {
    serviceName: 'calculator-service',
    handler: new Calculator.Processor(serviceHandlers),
  },
});

const port = opts.getServicePort('calculator');

export default app.listen(port, () => {
  console.log(`Calculator service listening on http://localhost:${port}`);
});
