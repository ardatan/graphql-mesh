import { readFileSync } from 'fs';
import { createServer } from 'http';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import { useApolloInlineTrace } from '@graphql-yoga/plugin-apollo-inline-trace';

createServer(
  createServeRuntime({
    subgraph: readFileSync('./schema.graphql', 'utf-8'),
    plugins: () => [useApolloInlineTrace()],
  }),
).listen(4001, '0.0.0.0', () => {
  console.log(`🚀 Server ready at http://0.0.0.0:4001/graphql`);
});
