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
 * but `endpoint` is real `graph.microsoft.com/{GRAPH_VERSION}` (`v1.0` or `beta`,
 * matching example `start` / `start:beta`). Fixture keeps the example-query type
 * surface small; abstract OData entity bases become unions discriminated by
 * `@odata.type` → `__typename` (Router-safe; no interface `implements`).
 */
const live = process.env.MSGRAPH_LIVE === '1';
const graphVersion = process.env.GRAPH_VERSION || 'v1.0';
const endpoint = live
  ? `https://graph.microsoft.com/${graphVersion}`
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
