import { readFileSync } from 'fs';
import { createServer } from 'http';
import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';
import http from '@graphql-mesh/transport-http';
import { useApolloInlineTrace } from '@graphql-yoga/plugin-apollo-inline-trace';

createServer(
  createGatewayRuntime({
    subgraph: readFileSync('./schema.graphql', 'utf-8'),
    transports: {
      http,
    },
    plugins: () => [useApolloInlineTrace()],
  }),
).listen(4001, '0.0.0.0', () => {
  console.log(`🚀 Server ready at http://0.0.0.0:4001/graphql`);
});
