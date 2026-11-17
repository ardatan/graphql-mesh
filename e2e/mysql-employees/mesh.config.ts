import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadSqlSubgraph } from '@omnigraph/sql';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadSqlSubgraph('Employees', {
        type: 'mysql',
        endpoint: `mysql://root:passwd@localhost:${opts.getServicePort('employees')}/employees`,
        includeTables: ['employees', 'dept_emp', 'departments'],
      }),
    },
  ],
});
