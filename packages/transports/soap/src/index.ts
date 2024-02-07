import { TransportExecutorFactoryFn } from '@graphql-mesh/transport-common';
import { createExecutorFromSchemaAST } from './executor.js';

export const getSubgraphExecutor: TransportExecutorFactoryFn<'soap'> =
  function getSOAPSubgraphExecutor({ transportEntry, getSubgraph, fetch }) {
    return createExecutorFromSchemaAST(getSubgraph(), fetch, transportEntry.headers);
  };

export { createExecutorFromSchemaAST } from './executor.js';
