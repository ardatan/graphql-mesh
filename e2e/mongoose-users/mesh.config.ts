import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadMongoSubgraph } from '@omnigraph/mongo';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadMongoSubgraph('Mongoose', {
        endpoint: `mongodb://127.0.0.1:${opts.getServicePort('mongo')}/mesh_users`,
        models: [{ name: 'User', path: './src/models.js#User' }],
      }),
    },
  ],
});
