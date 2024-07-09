import type { Transport } from '@graphql-mesh/transport-common';
import { createExecutorFromSchemaAST } from './executor.js';

export { createExecutorFromSchemaAST } from './executor.js';

export default {
  getSubgraphExecutor({ transportEntry, subgraph, fetch }) {
    let headers: Record<string, string> | undefined;
    if (typeof transportEntry.headers === 'string') {
      headers = JSON.parse(transportEntry.headers);
    }
    if (Array.isArray(transportEntry.headers)) {
      headers = Object.fromEntries(transportEntry.headers);
    }
    return createExecutorFromSchemaAST(subgraph, fetch, headers);
  },
} satisfies Transport<'soap'>;
