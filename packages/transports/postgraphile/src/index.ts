import { execute } from 'grafast';
import pg from 'pg';
import type { PostGraphileInstance } from 'postgraphile';
import { postgraphile } from 'postgraphile';
import { PostGraphileAmberPreset } from 'postgraphile/dist/presets/amber';
import { makePgService } from '@dataplan/pg/dist/adaptors/pg';
import type { DisposableExecutor, Transport } from '@graphql-mesh/transport-common';
import { makeAsyncDisposable } from '@graphql-mesh/utils';

export interface PostGraphileTransportOptions {
  /**
   * An array of PostgreSQL schemas that PostGraphile will use to create a GraphQL schema.
   * Defaults to ['public'].
   */
  schemas?: string[];
  /**
   * PostGraphile v5 plugin names to disable (e.g. "NodePlugin")
   */
  skipPlugins?: (keyof GraphileConfig.Plugins)[];
}

export default {
  async getSubgraphExecutor({ transportEntry, logger }): Promise<DisposableExecutor> {
    const connectionString: string = transportEntry.location;
    const opts: PostGraphileTransportOptions = transportEntry.options ?? {};

    const pgLogger = logger?.child('PostgreSQL');
    const pgPool = new pg.Pool({
      connectionString,
      log: pgLogger ? messages => pgLogger.debug(messages) : undefined,
    });

    const preset: GraphileConfig.Preset = {
      extends: [PostGraphileAmberPreset],
      pgServices: [
        makePgService({
          pool: pgPool,
          schemas: opts.schemas ?? ['public'],
        }),
      ],
      disablePlugins: opts.skipPlugins?.length ? opts.skipPlugins : undefined,
    };

    const instance: PostGraphileInstance = postgraphile(preset);
    const { schema, resolvedPreset } = await instance.getSchemaResult();

    function postgraphileExecutor({
      document,
      variables,
      context: meshContext,
      rootValue,
      operationName,
    }: any) {
      return execute({
        schema,
        document,
        variableValues: variables,
        contextValue: meshContext,
        rootValue,
        operationName: operationName ?? undefined,
        resolvedPreset,
        requestContext: { meshContext },
      }) as any;
    }

    return makeAsyncDisposable(postgraphileExecutor, () => pgPool.end());
  },
} satisfies Transport<PostGraphileTransportOptions>;
