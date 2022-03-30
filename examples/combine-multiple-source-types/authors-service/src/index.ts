import { Server, ServerCredentials } from '@grpc/grpc-js';

import { Author } from './proto/authors/v1/authors_service';

import { IAuthorsService, authorsServiceDefinition } from './proto/authors/v1/authors_service.grpc-server';

const authors: Author[] = [
  {
    editor: 'Gallimard',
    id: '0',
    name: 'Jean France',
  },
  {
    id: '1',
    editor: 'Pearson',
    name: 'James State',
  },
];

const service: IAuthorsService = {
  getAuthor: (call, callback) => {
    const author = authors.find(a => a.id === call.request.id);
    if (author) {
      callback(null, author);
    } else {
      callback({ code: 5 });
    }
  },
  listAuthors: (_, callback) => {
    callback(null, { items: authors });
  },
};

const server = new Server();

server.addService(authorsServiceDefinition, service);

server.bindAsync('0.0.0.0:4000', ServerCredentials.createInsecure(), () => {
  server.start();

  console.log('server is running on 0.0.0.0:4000');
});
