import { Opts } from '@e2e/opts';
import { defineConfig } from '@graphql-mesh/compose-cli';
import { loadODataSubgraph } from '@omnigraph/odata';

const opts = Opts(process.argv);

/**
 * Microsoft Graph OData → Connectors (mirrors `examples/odata-microsoft`).
 * Fixture metadata + local mock (`services/Graph.ts`) — PR e2e only.
 * Abstract OData entity bases become unions discriminated by
 * `@odata.type` → `__typename` (Router-safe; no interface `implements`).
 */
export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadODataSubgraph('MicrosoftGraph', {
        source: './fixtures/metadata.xml',
        endpoint: `http://127.0.0.1:${opts.getServicePort('Graph')}`,
        batch: 'json',
        expandNavProps: true,
        operationHeaders: {
          Authorization: 'Bearer {env.MSGRAPH_ACCESS_TOKEN}',
        },
      }),
    },
  ],
});
