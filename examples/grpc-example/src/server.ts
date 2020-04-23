import * as grpc from 'grpc';

import { ExampleService, IExampleServer } from './proto/Example_grpc_pb';
import { EmptyRequest, Genre, Movie, MoviesResult, SearchByCastRequest } from './proto/Example_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';

interface IRawMovie {
  cast: string[];
  name: string;
  rating: number;
  year: number;
  time: { seconds: number };
  genre: Genre;
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

function createMovie(movie: IRawMovie): Movie {
  const result = new Movie();

  result.setCastList(movie.cast);
  result.setName(movie.name);
  result.setYear(movie.year);
  result.setRating(movie.rating);
  const timestamp = new Timestamp();
  timestamp.setSeconds(movie.time.seconds);
  result.setTime(timestamp);
  result.setGenre(movie.genre);

  return result;
}

class ServerImpl implements IExampleServer {
  public getMovies(request: grpc.ServerUnaryCall<EmptyRequest>, callback: grpc.sendUnaryData<MoviesResult>) {
    const result = new MoviesResult();
    Movies.map(createMovie).forEach((movie: Movie) => result.addResult(movie));
    callback(null, result);
  }

  public searchMoviesByCast(call: grpc.ServerWriteableStream<SearchByCastRequest>) {
    console.log('call started');
    const input: SearchByCastRequest = call.request;
    let i: number = 1;
    call.on('error', error => {
      console.error(error);
      call.end();
    });
    const intervals = Movies.map(createMovie).map(movie => {
      if (movie.getCastList().indexOf(input.getCastname()) > -1) {
        const interval = setInterval(() => {
          console.log(movie.getName());
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
  }
}

function startServer() {
  const server = new grpc.Server();

  server.addService(ExampleService, new ServerImpl());
  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
  server.start();

  console.log('Server started, listening: 0.0.0.0:50051');
}

startServer();

process.on('uncaughtException', err => {
  console.error(`process on uncaughtException error: ${err}`);
});

process.on('unhandledRejection', err => {
  console.error(`process on unhandledRejection error: ${err}`);
});
