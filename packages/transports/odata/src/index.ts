import type { Transport } from '@graphql-mesh/transport-common';
import transportRest from '@graphql-mesh/transport-rest';

/**
 * @deprecated OData subgraphs now emit Federation Connectors (`@source` / `@connect`)
 * and run on `transport-rest` (Accept `odata.metadata` → `$select` / `$expand`).
 * This package remains as a thin alias for older `kind: "odata"` TransportEntries.
 */
const transport: Transport = {
  getSubgraphExecutor(opts) {
    return transportRest.getSubgraphExecutor(opts as any);
  },
};

export default transport;
