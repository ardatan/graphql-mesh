import { join } from 'path';
import { loadPackageDefinition, Server, ServerCredentials } from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';

const wrapServerWithReflection = require('grpc-node-server-reflection').default;

export default async function startServer() {
  const server: Server = wrapServerWithReflection(new Server());

  const packageDefinition = await load('./service.proto', {
    includeDirs: [join(__dirname, './proto')],
  });
  const grpcObject = loadPackageDefinition(packageDefinition);
  server.addService(grpcObject.GreetingService.service, {
    getGreeting(call, callback) {
      callback(null, { greeting: 'Hello ' + call.request.name });
    },
  });
  return new Promise<Server>((resolve, reject) => {
    server.bindAsync('0.0.0.0:50052', ServerCredentials.createInsecure(), (error, port) => {
      if (error) {
        reject(error);
        return;
      }
      server.start();

      console.log('gRPC Server started, listening: 0.0.0.0:' + port);
      resolve(server);
    });
  });
}
