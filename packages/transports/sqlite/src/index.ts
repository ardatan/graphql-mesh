import {
  createDefaultExecutor,
  type Executor,
  type Transport,
} from '@graphql-mesh/transport-common';
import { mapMaybePromise } from '@graphql-mesh/utils';
import { loadGraphQLSchemaFromOptions, type GraphQLSQLiteLoaderOpts } from '@omnigraph/sqlite';

export interface SQLiteTransportOptions {
  type: 'infile' | 'db';
}

export default {
  getSubgraphExecutor({ cwd, transportEntry }): Executor | PromiseLike<Executor> {
    const loaderOpts: GraphQLSQLiteLoaderOpts = { cwd };
    if (transportEntry.options.type === 'infile') {
      loaderOpts.infile = transportEntry.location;
    } else {
      loaderOpts.db = transportEntry.location;
    }
    return mapMaybePromise(loadGraphQLSchemaFromOptions(loaderOpts), schema =>
      createDefaultExecutor(schema),
    );
  },
} satisfies Transport<SQLiteTransportOptions>;
