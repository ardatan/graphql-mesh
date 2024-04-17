import { Args } from '@e2e/args';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { PubSub } from '@graphql-mesh/utils';
import { loadNeo4JSubgraph } from '@omnigraph/neo4j';

const args = Args(process.argv);

export const composeConfig = defineComposeConfig({
  target: args.get('target'),
  subgraphs: [
    {
      sourceHandler: loadNeo4JSubgraph('Movies', {
        endpoint: 'neo4j+s://demo.neo4jlabs.com',
        auth: {
          type: 'basic',
          username: 'movies',
          password: 'movies',
        },
        database: 'movies',
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  fusiongraph: '', // TODO: dont require fusiongraph option since it can be provided from as a CLI arg
  pubsub: new PubSub(),
});
