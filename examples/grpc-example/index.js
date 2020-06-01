const { readFileSync } = require('fs');
const { Server, loadPackageDefinition, ServerCredentials } = require('@grpc/grpc-js');
const { load } = require('@grpc/proto-loader');

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

async function startServer() {
  const server = new Server();

  const packageDefinition = await load('io/xtech/service.proto', {
    includeDirs: ['./proto'],
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
      let i = 1;
      call.on('error', error => {
        console.error(error);
        call.end();
      });
      const intervals = Movies.map(movie => {
        if (movie.cast.indexOf(input.castName) > -1) {
          const interval = setInterval(() => {
            console.log(movie.name);
            if (call.cancelled || call.destroyed) {
              intervals.forEach(clearInterval);
              console.log('call ended');
              return;
            }
            call.write(movie);
          }, i * 1000);
          i += 1;
          return interval;
        }
      });
    },
  });
  const rootCA = readFileSync('./certs/ca.crt');
  const certChain = readFileSync('./certs/server.crt');
  const privateKey = readFileSync('./certs/server.key');
  server.bindAsync(
    '0.0.0.0:50051',
    ServerCredentials.createSsl(rootCA, [{ private_key: privateKey, cert_chain: certChain }]),
    () => {
      server.start();

      console.log('Server started, listening: 0.0.0.0:50051');
    }
  );
}

startServer().catch(console.error);

process.on('uncaughtException', err => {
  console.error(`process on uncaughtException error: ${err}`);
});

process.on('unhandledRejection', err => {
  console.error(`process on unhandledRejection error: ${err}`);
});
