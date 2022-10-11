import { Server, loadPackageDefinition, ServerCredentials, ServiceClientConstructor } from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';
import { join } from 'path';

const wrapServerWithReflection = require('grpc-node-server-reflection').default;

export default async function startServer(subscriptionInterval = 1000) {
  const server = wrapServerWithReflection(new Server());

  const packageDefinition = await load('./service.proto', {
    includeDirs: [join(__dirname, './proto')],
  });
  const grpcObject = loadPackageDefinition(packageDefinition);
  server.addService(grpcObject.GreetingService.service, {
    getGreeting(call, callback) {
      callback(null, { greeting: 'Hello ' + call.request.name });
    },
  });
  server.bindAsync('0.0.0.0:50051', ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      throw error;
    }
    server.start();

    console.log('gRPC Server started, listening: 0.0.0.0:' + port);
  });
  return server;
}
