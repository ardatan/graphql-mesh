import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadODataSubgraph } from '@omnigraph/odata';

const opts = Opts(process.argv);
const graphPort = opts.getServicePort('Graph');

/**
 * Microsoft Graph OData → Connectors (mirrors `examples/odata-microsoft`).
 * Default: fixture metadata + local mock (`services/Graph.ts`).
 * Live Graph: set `MSGRAPH_LIVE=1` and point at the real endpoint (see test).
 */
export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadODataSubgraph('MicrosoftGraph', {
        source: './fixtures/metadata.xml',
        endpoint: `http://127.0.0.1:${graphPort}`,
        batch: 'json',
        expandNavProps: true,
        operationHeaders: {
          Authorization: 'Bearer {env.MSGRAPH_ACCESS_TOKEN}',
        },
      }),
    },
  ],
});
