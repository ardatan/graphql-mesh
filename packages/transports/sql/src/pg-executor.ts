import { execute as grafastExecute } from 'grafast';
import type { GraphQLSchema } from 'graphql';
import type { Pool } from 'pg';
import { makePgAdaptorWithPgClient } from '@dataplan/pg/adaptors/pg';
import type { DisposableExecutor } from '@graphql-mesh/transport-common';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { wirePostgresSqlPlans } from './pg-plans.js';
import { buildPgRegistryFromSqlSchema } from './pg-registry.js';
import type { SqlClient } from './types.js';

export interface CreatePostgresGrafastExecutorOpts {
  subgraph: GraphQLSchema;
  sqlClient: SqlClient;
  /** Called on dispose in addition to releasing withPgClient */
  disposeClient: () => void | Promise<void>;
  /** Postgres schema for `@dataplan/pg` table identity (default public). */
  pgSchema?: string;
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

  const { registry, relationNames, tableByType, installedRelations, sqlToAttrByTable } =
    buildPgRegistryFromSqlSchema(opts.subgraph, {
      pgSchema: opts.pgSchema,
    });
  const schema = wirePostgresSqlPlans(opts.subgraph, registry, {
    relationNames,
    tableByType,
    installedRelations,
    sqlToAttrByTable,
  });
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
    withPgClient.release?.();
    const disposed = opts.disposeClient();
    if (disposed != null && typeof (disposed as Promise<void>).then === 'function') {
      (disposed as Promise<void>).catch(() => undefined);
    }
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
