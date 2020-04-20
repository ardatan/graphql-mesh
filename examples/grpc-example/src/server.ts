import * as debug from 'debug';
import * as grpc from 'grpc';

import { ExampleService, IExampleServer } from './proto/Example_grpc_pb';
import { EmptyRequest, Movie, MoviesResult, SearchByCastRequest } from './proto/Example_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';

const log = debug('SampleServer');

interface IRawMovie {
  cast: string[];
  name: string;
  rating: number;
  year: number;
  time: { seconds: number };
}

const seconds = Date.now();

const Movies = [
  {
    cast: ['Tom Cruise', 'Simon Pegg', 'Jeremy Renner'],
    name: 'Mission: Impossible Rogue Nation',
    rating: 0.97,
    year: 2015,
    time: {
      seconds,
    },
  },
  {
    cast: ['Tom Cruise', 'Simon Pegg', 'Henry Cavill'],
    name: 'Mission: Impossible - Fallout',
    rating: 0.93,
    year: 2018,
    time: {
      seconds,
    },
  },
  {
    cast: ['Leonardo DiCaprio', 'Jonah Hill', 'Margot Robbie'],
    name: 'The Wolf of Wall Street',
    rating: 0.78,
    year: 2013,
    time: {
      seconds,
    },
  },
];

function createMovie(movie: IRawMovie): Movie {
  const result = new Movie();

  result.setCastList(movie.cast);
  result.setName(movie.name);
  result.setYear(movie.year);
  result.setRating(movie.rating);
  const timestamp = new Timestamp();
  timestamp.setSeconds(movie.time.seconds);
  result.setTime(timestamp);

  return result;
}

class ServerImpl implements IExampleServer {
  public getMovies(request: grpc.ServerUnaryCall<EmptyRequest>, callback: grpc.sendUnaryData<MoviesResult>) {
    const result = new MoviesResult();
    Movies.map(createMovie).forEach((movie: Movie) => result.addResult(movie));
    callback(null, result);
  }

  public searchMoviesByCast(call: grpc.ServerWriteableStream<SearchByCastRequest>) {
    log('call started');
    const input: SearchByCastRequest = call.request;
    let i: number = 1;
    call.on('error', error => {
      log(error);
      call.end();
    });
    Movies.map(createMovie).forEach((movie: Movie) => {
      if (movie.getCastList().indexOf(input.getCastname()) > -1) {
        setTimeout(() => {
          log(movie.getName());
          call.write(movie);
        }, i * 1000);
        i += 1;
      }
    });
    setTimeout(() => {
      call.end();
      log('call ended');
    }, 3000);
  }
}

function startServer() {
  const server = new grpc.Server();

  server.addService(ExampleService, new ServerImpl());
  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
  server.start();

  log('Server started, listening: 0.0.0.0:50051');
}

startServer();

process.on('uncaughtException', err => {
  log(`process on uncaughtException error: ${err}`);
});

process.on('unhandledRejection', err => {
  log(`process on unhandledRejection error: ${err}`);
});
