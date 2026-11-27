/**
 * Non-Connect Mesh subgraph: `buildSubgraphSchema` with hand resolvers
 * (no `@connect` / Apollo Connectors). SDL: `subgraphs/users.graphql`.
 */
import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { Opts } from '@e2e/opts';
import { buildSubgraphSchema } from '@graphql-mesh/subgraph';
import { createHitCounter } from './hits.js';
import { loadSubgraphSdl } from './load-subgraph-sdl.js';

const opts = Opts(process.argv);
const port = opts.getServicePort('users', true);
const hits = createHitCounter();

const users: Record<string, { id: string; name: string }> = {
  u1: { id: 'u1', name: 'Ada' },
};

async function main() {
  const schema = await buildSubgraphSchema(loadSubgraphSdl('users'), {
    skipTransports: true,
    resolvers: {
      Query: {
        user: (_: unknown, { id }: { id: string }) => users[id] || null,
      },
      User: {
        __resolveReference: (ref: { id: string }) => users[ref.id] || null,
      },
    },
  });

  const yoga = createYoga({ schema, logging: false, graphqlEndpoint: '/graphql' });
  createServer((req, res) => {
    if (hits.maybeServe(req, res)) return;
    return yoga(req, res);
  }).listen(port, '127.0.0.1', () => {
    console.log(`users (non-connect Mesh) at http://127.0.0.1:${port}/graphql`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
