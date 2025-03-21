import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadOpenAPISubgraph } from '@omnigraph/openapi';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadOpenAPISubgraph('petstore', {
        source: `http://localhost:${opts.getServicePort('petstore')}/api/v3/openapi.json`,
        // endpoint must be manually specified because the openapi.json spec doesn't contain one
        endpoint: `http://localhost:${opts.getServicePort('petstore')}/api/v3`,
      }),
    },
  ],
});
