import { createDefaultExecutor, Transport } from '@graphql-mesh/transport-common';
import { GraphQLSQLiteLoaderOpts, loadGraphQLSchemaFromOptions } from '@omnigraph/sqlite';

export interface SQLiteTransportOptions {
  type: 'infile' | 'db';
}

export default {
  getSubgraphExecutor({ cwd, transportEntry }) {
    const loaderOpts: GraphQLSQLiteLoaderOpts = { cwd };
    if (transportEntry.options.type === 'infile') {
      loaderOpts.infile = transportEntry.location;
    } else {
      loaderOpts.db = transportEntry.location;
    }
    return loadGraphQLSchemaFromOptions(loaderOpts).then(schema => createDefaultExecutor(schema));
  },
} satisfies Transport<'sqlite', SQLiteTransportOptions>;
