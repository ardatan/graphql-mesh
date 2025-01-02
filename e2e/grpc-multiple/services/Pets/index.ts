import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { join } from 'path';
import { Opts } from '@e2e/opts';
import { loadPackageDefinition, Server, ServerCredentials } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';

const _dirname = dirname(fileURLToPath(import.meta.url));

// Load the protobuf file
const PROTO_PATH = join(_dirname, 'pets.proto');
const packageDefinition = loadSync(PROTO_PATH, {});
const petsProto: any = loadPackageDefinition(packageDefinition).pets;
const reflection = new ReflectionService(packageDefinition);

// Static pet store data
const pets = [
  { id: 1, name: 'Pet1' },
  { id: 2, name: 'Pet2' },
  { id: 3, name: 'Pet3' },
  { id: 4, name: 'Pet4' },
  { id: 5, name: 'Pet5' },
];

// gRPC service methods
const petService = {
  GetAllPets: (call, callback) => {
    callback(null, { pets });
  },
};

const opts = Opts(process.argv);

const port = opts.getServicePort('Pets');

// Start the server
function main() {
  const server = new Server();
  server.addService(petsProto.PetService.service, petService);
  reflection.addToServer(server);

  server.bindAsync('0.0.0.0:' + port, ServerCredentials.createInsecure(), () => {
    console.log('gRPC Server running with reflection on port ' + port);
    server.start();
  });
}

main();
