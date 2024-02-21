import { readFileSync } from 'fs';
import { join } from 'path';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { loadMySQLSubgraph } from '@omnigraph/mysql';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadMySQLSubgraph('Employees', {
        endpoint: 'mysql://root:passwd@localhost:33306/employees',
      }),
    },
  ],
});

export const serveConfig = defineServeConfig({
  fusiongraph: './fusiongraph.graphql',
  graphiql: {
    defaultQuery: readFileSync(join(__dirname, './example-query.graphql'), 'utf8'),
  },
});
