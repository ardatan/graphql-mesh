import { DocumentNode, GraphQLSchema, isSchema, parse } from 'graphql';
// eslint-disable-next-line import/no-extraneous-dependencies
import { TransportEntry } from '@graphql-mesh/transport-common';
import { SubschemaConfig } from '@graphql-tools/delegate';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';
import { getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { UnifiedGraphHandler } from './useUnifiedGraph.js';

function ensureSchemaAST(source: GraphQLSchema | DocumentNode | string) {
  if (isSchema(source)) {
    return getDocumentNodeFromSchema(source);
  }
  if (typeof source === 'string') {
    return parse(source, { noLocation: true });
  }
  return source;
}

export const handleFederationSupergraph: UnifiedGraphHandler = function ({
  unifiedGraph,
  onSubgraphExecute,
  additionalTypeDefs,
  additionalResolvers = [],
}) {
  const supergraphSdl = ensureSchemaAST(unifiedGraph);
  const transportEntryMap: Record<string, TransportEntry> = {};
  let subschemas: SubschemaConfig[] = [];
  const newUnifiedGraph = getStitchedSchemaFromSupergraphSdl({
    supergraphSdl,
    onSubschemaConfig(subschemaConfig) {
      const subschemaName = subschemaConfig.name;
      transportEntryMap[subschemaName] = {
        kind: 'http',
        subgraph: subschemaName,
        location: subschemaConfig.endpoint,
      };
      subschemaConfig.executor = function subschemaExecutor(req) {
        return onSubgraphExecute(subschemaName, req);
      };
    },
    batch: true,
    onStitchingOptions(opts: any) {
      subschemas = opts.subschemas;
      opts.typeDefs = [opts.typeDefs, additionalTypeDefs];
      opts.resolvers = additionalResolvers;
    },
  });
  return {
    unifiedGraph: newUnifiedGraph,
    subschemas,
    transportEntryMap,
    additionalResolvers: [],
  };
};
