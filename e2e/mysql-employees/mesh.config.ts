import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadMySQLSubgraph } from '@omnigraph/mysql';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadMySQLSubgraph('Employees', {
        endpoint: `mysql://root:passwd@0.0.0.0:${opts.getServicePort('employees')}/employees`,
      }),
    },
  ],
});
