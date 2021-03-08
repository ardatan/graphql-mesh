const {
  promises: { readFile },
} = require('fs');
const { Server, loadPackageDefinition, ServerCredentials } = require('@grpc/grpc-js');
const { load } = require('@grpc/proto-loader');
const { join } = require('path');

const seconds = Date.now();

const Genre = {
  UNSPECIFIED: 0,
  ACTION: 1,
  DRAMA: 2,
};

const Movies = [
  {
    cast: ['Tom Cruise', 'Simon Pegg', 'Jeremy Renner'],
    name: 'Mission: Impossible Rogue Nation',
    rating: 0.97,
    year: 2015,
    time: {
      seconds,
    },
    genre: Genre.ACTION,
  },
  {
    cast: ['Tom Cruise', 'Simon Pegg', 'Henry Cavill'],
    name: 'Mission: Impossible - Fallout',
    rating: 0.93,
    year: 2018,
    time: {
      seconds,
    },
    genre: Genre.ACTION,
  },
  {
    cast: ['Leonardo DiCaprio', 'Jonah Hill', 'Margot Robbie'],
    name: 'The Wolf of Wall Street',
    rating: 0.78,
    year: 2013,
    time: {
      seconds,
    },
    genre: Genre.DRAMA,
  },
];

module.exports = async function startServer(subscriptionInterval = 1000) {
  const server = new Server();

  const packageDefinition = await load('./io/xtech/service.proto', {
    includeDirs: [join(__dirname, './proto')],
  });
  const grpcObject = loadPackageDefinition(packageDefinition);
  server.addService(grpcObject.io['xtech'].Example.service, {
    getMovies(call, callback) {
      const result = Movies.filter(movie => {
        for (const [key, value] of Object.entries(call.request.movie)) {
          if (movie[key] === value) {
            return true;
          }
        }
      });
      const moviesResult = { result };
      console.log('called with MetaData:', JSON.stringify(call.metadata.getMap()));
      callback(null, moviesResult);
    },
    searchMoviesByCast(call) {
      console.log('call started');
      console.log('called with MetaData:', JSON.stringify(call.metadata.getMap()));
      const input = call.request;
      call.on('error', error => {
        console.error(error);
        call.end();
      });
      const interval = setInterval(() => {
        Movies.forEach((movie, i) => {
          if (movie.cast.indexOf(input.castName) > -1) {
            setTimeout(() => {
              if (call.cancelled || call.destroyed) {
                console.log('call ended');
                clearInterval(interval);
                return;
              }
              console.log('call received', movie);
              call.write(movie);
            }, i * subscriptionInterval);
          }
        });
      }, subscriptionInterval * (Movies.length + 1));
    },
  });
  const [rootCA, cert_chain, private_key] = await Promise.all([
    readFile(join(__dirname, './certs/ca.crt')),
    readFile(join(__dirname, './certs/server.crt')),
    readFile(join(__dirname, './certs/server.key')),
  ]);
  server.bindAsync(
    '0.0.0.0:50051',
    ServerCredentials.createSsl(rootCA, [{ private_key, cert_chain }]),
    (error, port) => {
      if (error) {
        throw error;
      }
      server.start();

      console.log('Server started, listening: 0.0.0.0:' + port);
    }
  );
  return server;
}
