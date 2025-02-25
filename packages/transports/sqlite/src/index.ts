import {
  createDefaultExecutor,
  type Executor,
  type Transport,
} from '@graphql-mesh/transport-common';
import { loadGraphQLSchemaFromOptions, type GraphQLSQLiteLoaderOpts } from '@omnigraph/sqlite';
import { handleMaybePromise, type MaybePromise } from '@whatwg-node/promise-helpers';

export interface SQLiteTransportOptions {
  type: 'infile' | 'db';
}

export default {
  getSubgraphExecutor({ cwd, transportEntry }): MaybePromise<Executor> {
    const loaderOpts: GraphQLSQLiteLoaderOpts = { cwd };
    if (transportEntry.options.type === 'infile') {
      loaderOpts.infile = transportEntry.location;
    } else {
      loaderOpts.db = transportEntry.location;
    }
    return handleMaybePromise(
      () => loadGraphQLSchemaFromOptions(loaderOpts),
      schema => createDefaultExecutor(schema),
    );
  },
} satisfies Transport<SQLiteTransportOptions>;
