import { join } from 'path';
import { loadPackageDefinition, Server, ServerCredentials } from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';

const wrapServerWithReflection = require('grpc-node-server-reflection').default;

export default async function startServer() {
  const server: Server = wrapServerWithReflection(new Server());

  const helloworldPackageDefinition = await load('./helloworld.proto', {
    includeDirs: [join(__dirname, './proto')],
  });
  const helloworldGrpcObject = loadPackageDefinition(helloworldPackageDefinition);
  server.addService(helloworldGrpcObject.helloworld.GreetingService.service, {
    getGreeting(call, callback) {
      callback(null, { greeting: 'Hello ' + call.request.name });
    },
  });
  const playgroundPackageDefinition = await load('./Playground/playground.proto', {
    includeDirs: [join(__dirname, './proto')],
  });
  const playgroundGrpcObject = loadPackageDefinition(playgroundPackageDefinition);
  server.addService(playgroundGrpcObject.artnet.coredata.playground.Playground.service, {});
  return new Promise<Server>((resolve, reject) => {
    server.bindAsync('0.0.0.0:50052', ServerCredentials.createInsecure(), (error, port) => {
      if (error) {
        reject(error);
        return;
      }
      console.log('gRPC Server started, listening: 0.0.0.0:' + port);
      resolve(server);
    });
  });
}
