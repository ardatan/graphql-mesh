import { Args } from '@e2e/args';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadNeo4JSubgraph } from '@omnigraph/neo4j';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadNeo4JSubgraph('Movies', {
        endpoint: `neo4j://0.0.0.0:${args.getServicePort('neo4j')}`,
        auth: {
          type: 'basic',
          username: 'neo4j',
          password: 'password',
        },
      }),
    },
  ],
});
