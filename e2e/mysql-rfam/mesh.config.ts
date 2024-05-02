import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { PubSub } from '@graphql-mesh/utils';
import { loadMySQLSubgraph } from '@omnigraph/mysql';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadMySQLSubgraph('Rfam', {
        endpoint: 'mysql://rfamro@mysql-rfam-public.ebi.ac.uk:4497/Rfam',
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  fusiongraph: '', // TODO: dont require fusiongraph option since it can be provided from as a CLI arg
  pubsub: new PubSub(),
});
