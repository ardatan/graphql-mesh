import * as express from 'express';
import { createThriftServer } from '@creditkarma/thrift-server-express';
import { Calculator } from './codegen';

const PORT = 9876;

const serviceHandlers: Calculator.IHandler<express.Request> = {
  add(request, context?: express.Request): number {
    return request.left + request.right;
  },
  subtract(left: number, right: number, context?: express.Request): number {
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

export default app.listen(PORT, () => {
  if (!process.env.CI) {
    console.log(`Express server listening on port: ${PORT}`);
  }
});
