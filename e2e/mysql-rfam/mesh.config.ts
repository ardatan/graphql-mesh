import { Args } from '@e2e/args';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { PubSub } from '@graphql-mesh/utils';
import { loadMySQLSubgraph } from '@omnigraph/mysql';

const args = Args(process.argv);

export const composeConfig = defineComposeConfig({
  target: args.get('target'),
  subgraphs: [
    {
      sourceHandler: loadMySQLSubgraph('Rfam', {
        endpoint: 'mysql://rfamro@mysql-rfam-public.ebi.ac.uk:4497/Rfam',
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  port: args.getPort(),
  fusiongraph: args.get('fusiongraph'),
  pubsub: new PubSub(),
});
