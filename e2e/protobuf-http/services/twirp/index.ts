import { createServer } from 'node:http';
import { Opts } from '@e2e/opts';
import { filterMovies } from '../shared-movies.js';
import { Genre, Movie, MovieRequest, MoviesResult } from './gen/movies.js';
import { createExampleServer } from './gen/movies.twirp.js';

const opts = Opts(process.argv);
const port = opts.getServicePort('twirp');

const server = createExampleServer({
  async GetMovies(_ctx, request: MovieRequest): Promise<MoviesResult> {
    const movie = request.movie;
    const matched = filterMovies(
      movie
        ? {
            name: movie.name,
            year: movie.year,
            rating: movie.rating,
            genre: movie.genre,
          }
        : undefined,
    );
    return MoviesResult.create({
      result: matched.map(row =>
        Movie.create({
          name: row.name,
          year: BigInt(row.year),
          rating: row.rating,
          cast: row.cast,
          genre: row.genre as Genre,
        }),
      ),
    });
  },
});

createServer(server.httpHandler({ prefix: '/twirp' })).listen(port, () => {
  console.log(`Twirp movies service listening on http://localhost:${port}`);
  console.log('  POST /twirp/Example/GetMovies (application/protobuf)');
});
