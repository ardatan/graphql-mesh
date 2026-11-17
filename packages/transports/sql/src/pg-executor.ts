import type { Pool } from 'pg';
import { makePgAdaptorWithPgClient } from '@dataplan/pg/adaptors/pg';
import { execute as grafastExecute } from 'grafast';
import type { DisposableExecutor } from '@graphql-mesh/transport-common';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import type { GraphQLSchema } from 'graphql';
import { buildPgRegistryFromSqlSchema } from './pg-registry.js';
import { wirePostgresSqlPlans } from './pg-plans.js';
import type { SqlClient } from './types.js';

export interface CreatePostgresGrafastExecutorOpts {
  subgraph: GraphQLSchema;
  sqlClient: SqlClient;
  /** Called on dispose in addition to releasing withPgClient */
  disposeClient: () => void | Promise<void>;
}

/**
 * Postgres fast path: Grafast + `@dataplan/pg` plans for `@sql` fields.
 * Requires a Node `pg.Pool` on `sqlClient.pgPool` (Bun.SQL falls back to the
 * generic GraphQL.js planner).
 */
export function createPostgresGrafastExecutor(
  opts: CreatePostgresGrafastExecutorOpts,
): DisposableExecutor | null {
  const pool = opts.sqlClient.pgPool;
  if (!pool) return null;

  const { registry, relationNames } = buildPgRegistryFromSqlSchema(opts.subgraph);
  const schema = wirePostgresSqlPlans(opts.subgraph, registry, { relationNames });
  const withPgClient = makePgAdaptorWithPgClient(pool);

  const executor: DisposableExecutor = async function postgresGrafastExecutor(executionRequest) {
    const baseContext =
      executionRequest.context && typeof executionRequest.context === 'object'
        ? executionRequest.context
        : {};
    const contextValue = {
      ...baseContext,
      pgSettings: (baseContext as any).pgSettings ?? {},
      withPgClient,
      pgSubscriber: (baseContext as any).pgSubscriber ?? null,
    };

    return grafastExecute({
      schema,
      document: executionRequest.document,
      variableValues: executionRequest.variables,
      rootValue: executionRequest.rootValue,
      contextValue,
      operationName: executionRequest.operationName,
    } as any);
  };

  executor[DisposableSymbols.dispose] = () => {
    void withPgClient.release?.();
    void opts.disposeClient();
  };
  executor[DisposableSymbols.asyncDispose] = async () => {
    await withPgClient.release?.();
    await opts.disposeClient();
  };
  return executor;
}

export function hasPgPool(client: SqlClient): client is SqlClient & { pgPool: Pool } {
  return Boolean(client.pgPool);
}
