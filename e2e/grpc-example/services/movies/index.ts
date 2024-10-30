import { dirname, join } from 'path';
import { Opts } from '@e2e/opts';
import {
  loadPackageDefinition,
  Server,
  ServerCredentials,
  type ServiceClientConstructor,
} from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';
import { fileURLToPath } from 'url';

const opts = Opts(process.argv);

const seconds = new Date('2020-12-20').getTime();

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
    year: BigInt(2015),
    time: {
      seconds,
    },
    genre: Genre.ACTION,
  },
  {
    cast: ['Tom Cruise', 'Simon Pegg', 'Henry Cavill'],
    name: 'Mission: Impossible - Fallout',
    rating: 0.93,
    year: BigInt(2018),
    time: {
      seconds,
    },
    genre: Genre.ACTION,
  },
  {
    cast: ['Leonardo DiCaprio', 'Jonah Hill', 'Margot Robbie'],
    name: 'The Wolf of Wall Street',
    rating: 0.78,
    year: BigInt(2013),
    time: {
      seconds,
    },
    genre: Genre.DRAMA,
  },
];

async function startServer(subscriptionInterval = 1000, debug = false): Promise<Server> {
  const logger = debug ? (...args) => console.log(...args) : () => { };
  const server = new Server();

  const packageDefinition = await load('./service.proto', {
    includeDirs: [join(dirname(fileURLToPath(import.meta.url)), './proto')],
  });
  const grpcObject = loadPackageDefinition(packageDefinition);
  server.addService((grpcObject.Example as ServiceClientConstructor).service, {
    getMovies(call, callback) {
      const result = Movies.filter(movie => {
        for (const [key, value] of Object.entries(call.request.movie)) {
          if (movie[key] === value) {
            return true;
          }
        }
      });
      const moviesResult = { result };
      logger('called with MetaData:', JSON.stringify(call.metadata.getMap()));
      callback(null, moviesResult);
    },
    async searchMoviesByCast(call) {
      logger('call started');
      logger('called with MetaData:', JSON.stringify(call.metadata.getMap()));
      const input = call.request;
      call.on('error', error => {
        console.error(error);
        call.end();
      });
      for (const movie of Movies) {
        await new Promise(resolve => setTimeout(resolve, subscriptionInterval));
        if (call.cancelled || call.destroyed) {
          logger('call ended');
          return;
        }
        if (movie.cast.includes(input.castName)) {
          logger('call received', movie);
          call.write(movie);
        }
      }
      call.end();
    },
  });
  return new Promise((resolve, reject) => {
    server.bindAsync(
      '0.0.0.0:' + opts.getServicePort('movies'),
      ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          reject(error);
          return;
        }
        logger('Server started, listening: 0.0.0.0:' + port);
        resolve(server);
      },
    );
  });
}

startServer(300, true).catch(console.error);

process.on('uncaughtException', err => {
  console.error(`process on uncaughtException error: ${err}`);
});

process.on('unhandledRejection', err => {
  console.error(`process on unhandledRejection error: ${err}`);
});
