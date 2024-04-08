import * as express from 'express';
import { createThriftServer } from '@creditkarma/thrift-server-express';
import { Args } from '@e2e/args';
import { Calculator } from './__generated__';

const args = Args(process.argv);

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

const port = args.getServicePort('calculator');

export default app.listen(port, () => {
  console.log(`Calculator service listening on http://localhost:${port}`);
});
