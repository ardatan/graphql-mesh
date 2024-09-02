import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadNeo4JSubgraph } from '@omnigraph/neo4j';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadNeo4JSubgraph('Movies', {
        endpoint: `neo4j://localhost:${opts.getServicePort('neo4j')}`,
        auth: {
          type: 'basic',
          username: 'neo4j',
          password: 'password',
        },
      }),
    },
  ],
});
