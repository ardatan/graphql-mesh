import type { TransportExecutorFactoryFn } from '@graphql-mesh/transport-common';
import { createExecutorFromSchemaAST } from './executor.js';

export const getSubgraphExecutor: TransportExecutorFactoryFn<'soap'> =
  function getSOAPSubgraphExecutor({ transportEntry, subgraph, fetch }) {
    let headers: Record<string, string> | undefined;
    if (typeof transportEntry.headers === 'string') {
      headers = JSON.parse(transportEntry.headers);
    }
    if (Array.isArray(transportEntry.headers)) {
      headers = Object.fromEntries(transportEntry.headers);
    }
    return createExecutorFromSchemaAST(subgraph, fetch, headers);
  };

export { createExecutorFromSchemaAST } from './executor.js';
