import { createServer } from 'node:http';
import type { ConnectRouter } from '@connectrpc/connect';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { create } from '@bufbuild/protobuf';
import { Opts } from '@e2e/opts';
import { filterMovies } from '../shared-movies.js';
import { Example, Genre, MovieSchema, MoviesResultSchema } from './gen/movies_pb.js';

const opts = Opts(process.argv);
const port = opts.getServicePort('connect');

const handler = connectNodeAdapter({
  routes(router: ConnectRouter) {
    router.service(Example, {
      getMovies(req) {
        const matched = filterMovies(
          req.movie
            ? {
                name: req.movie.name,
                year: req.movie.year,
                rating: req.movie.rating,
                genre: req.movie.genre,
              }
            : undefined,
        );
        return create(MoviesResultSchema, {
          result: matched.map(movie =>
            create(MovieSchema, {
              name: movie.name,
              year: BigInt(movie.year),
              rating: movie.rating,
              cast: movie.cast,
              genre: movie.genre as Genre,
            }),
          ),
        });
      },
    });
  },
});

createServer(handler).listen(port, () => {
  console.log(`ConnectRPC movies service listening on http://localhost:${port}`);
  console.log('  POST /Example/GetMovies (application/proto)');
});
