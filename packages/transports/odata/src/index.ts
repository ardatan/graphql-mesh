import { createDefaultExecutor, type Transport } from '@graphql-mesh/transport-common';
import { processDirectives } from '@omnigraph/odata';

export default {
  getSubgraphExecutor({ subgraph, fetch }) {
    return createDefaultExecutor(
      processDirectives({
        schema: subgraph,
        fetchFn: fetch,
      }),
    );
  },
} satisfies Transport;
