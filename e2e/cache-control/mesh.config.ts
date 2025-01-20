import { Opts } from '@e2e/opts';
import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);
const booksPort = opts.getServicePort('books');
const authorsPort = opts.getServicePort('authors');
const commentsPort = opts.getServicePort('comments');

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('books', {
        endpoint: `http://localhost:${booksPort}/graphql`,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('authors', {
        endpoint: `http://localhost:${authorsPort}/graphql`,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('comments', {
        endpoint: `http://localhost:${commentsPort}/graphql`,
      }),
    },
  ],
});
