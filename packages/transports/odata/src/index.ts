import { createDefaultExecutor, type Transport } from '@graphql-mesh/transport-common';
import { processDirectives } from '@omnigraph/odata';

const transport: Transport = {
  getSubgraphExecutor({ subgraph, fetch }) {
    return createDefaultExecutor(
      processDirectives({
        schema: subgraph,
        fetchFn: fetch,
      }),
    );
  },
};

export default transport;
