import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadODataSubgraph } from '@omnigraph/odata';

const opts = Opts(process.argv);

/**
 * Microsoft Graph OData → Connectors (mirrors `examples/odata-microsoft`).
 *
 * Default: fixture metadata + local mock (`services/Graph.ts`) — PR e2e.
 *
 * Live (`MSGRAPH_LIVE=1`): same fixture schema surface as the v0 example queries,
 * but `endpoint` is real `graph.microsoft.com`. Full live `$metadata` is ~1.8MB and
 * includes abstract `directoryObject` that Apollo Router rejects in join form; the
 * fixture keeps hive+apollo dual-runtime coverage while still exercising real Graph
 * data for `me` / `messages` / `groups` / `drives`.
 */
const live = process.env.MSGRAPH_LIVE === '1';
const endpoint = live
  ? 'https://graph.microsoft.com/v1.0'
  : `http://127.0.0.1:${opts.getServicePort('Graph')}`;

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadODataSubgraph('MicrosoftGraph', {
        source: './fixtures/metadata.xml',
        endpoint,
        batch: 'json',
        expandNavProps: true,
        operationHeaders: {
          Authorization: 'Bearer {env.MSGRAPH_ACCESS_TOKEN}',
        },
      }),
    },
  ],
});
