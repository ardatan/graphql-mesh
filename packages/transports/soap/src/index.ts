import { TransportExecutorFactoryFn } from '@graphql-mesh/transport-common';
import { createExecutorFromSchemaAST } from './executor.js';

export const getSubgraphExecutor: TransportExecutorFactoryFn<'soap'> =
  function getSOAPSubgraphExecutor({ transportEntry, subgraph, fetch }) {
    return createExecutorFromSchemaAST(subgraph, fetch, transportEntry.headers);
  };

export { createExecutorFromSchemaAST } from './executor.js';
