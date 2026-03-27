import pg from 'pg';
import { postgraphile } from 'postgraphile';
import { PostGraphileAmberPreset } from 'postgraphile/presets/amber';
import { makePgService } from '@dataplan/pg/adaptors/pg';
import type { PostGraphileTransportOptions } from '@graphql-mesh/transport-postgraphile';
import type { Logger } from '@graphql-mesh/types';

export type { PostGraphileTransportOptions } from '@graphql-mesh/transport-postgraphile';

export interface LoadGraphQLSchemaFromPostgraphileOpts {
  /**
   * A connection string to your Postgres database
   */
  connectionString: string;
  /**
   * An array of PostgreSQL schemas that PostGraphile will use to create a GraphQL schema.
   * Defaults to ['public'].
   */
  schemas?: string[];
  /**
   * Extra PostGraphile v5 plugins to append (must be GraphileConfig.Plugin objects compatible with v5)
   */
  appendPlugins?: GraphileConfig.Plugin[];
  /**
   * PostGraphile v5 plugin names to disable (e.g. "NodePlugin")
   */
  skipPlugins?: (keyof GraphileConfig.Plugins)[];
  /**
   * A PostGraphile v5 preset object merged on top of the default PostGraphileAmberPreset.
   */
  options?: GraphileConfig.Preset;
  /**
   * Logger instance
   */
  logger?: Logger;
}

export async function loadGraphQLSchemaFromPostgraphile(
  subgraphName: string,
  opts: LoadGraphQLSchemaFromPostgraphileOpts,
) {
  const { connectionString, schemas, appendPlugins, skipPlugins, options, logger } = opts;

  const pgLogger = logger?.child('PostgreSQL');
  const pgPool = new pg.Pool({
    connectionString,
    log: pgLogger ? messages => pgLogger.debug(messages) : undefined,
  });

  try {
    const preset: GraphileConfig.Preset = {
      extends: [PostGraphileAmberPreset],
      pgServices: [
        makePgService({
          pool: pgPool,
          schemas: schemas ?? ['public'],
        }),
      ],
      plugins: appendPlugins?.length ? appendPlugins : undefined,
      disablePlugins: skipPlugins?.length ? skipPlugins : undefined,
      ...options,
    };

    const instance = postgraphile(preset);
    const { schema } = await instance.getSchemaResult();

    const transportOptions: PostGraphileTransportOptions = {
      schemas,
      skipPlugins,
    };

    const extensionsObj: any = (schema.extensions = schema.extensions || {});
    extensionsObj.directives ||= {};
    extensionsObj.directives.transport = {
      kind: 'postgraphile',
      subgraph: subgraphName,
      location: connectionString,
      options: transportOptions,
    };

    return schema;
  } finally {
    await pgPool.end();
  }
}

export function loadPostgraphileSubgraph(
  name: string,
  opts: LoadGraphQLSchemaFromPostgraphileOpts,
) {
  return ({ logger }: { logger?: Logger } = {}) => ({
    name,
    schema$: loadGraphQLSchemaFromPostgraphile(name, {
      ...opts,
      logger: opts.logger ?? logger,
    }),
  });
}
