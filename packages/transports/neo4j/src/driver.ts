import neo4j from 'neo4j-driver';
import { type Logger } from '@graphql-hive/logger';
import type { Neo4JAuthOpts } from './auth.js';
import { getAuthFromOpts } from './auth.js';

/**
 * Options for constructing a `neo4j-driver` `Driver` used by the Neo4j loader and transport.
 *
 * @example
 * ```ts
 * const opts: Neo4JDriverOpts = {
 *   endpoint: 'neo4j+s://db.example.com:7687',
 *   auth: { type: 'basic', username: 'neo4j', password: 'secret' },
 * }
 * const driver = getDriverFromOpts(opts)
 * ```
 */
export interface Neo4JDriverOpts {
  /**
   * Bolt URL for the Neo4j instance (or cluster entry point).
   *
   * @example 'neo4j://localhost:7687'
   * @example 'neo4j+s://xxxx.databases.neo4j.io'
   */
  endpoint: string;
  /**
   * Driver authentication. Omit for unauthenticated local setups (for example a local Neo4j
   * without credentials). Maps through {@link getAuthFromOpts} to a `neo4j-driver` auth token.
   *
   * @default unauthenticated (`scheme: "none"`) when omitted
   * @example { type: 'basic', username: 'neo4j', password: 'secret' }
   */
  auth?: Neo4JAuthOpts;
  /**
   * Optional Mesh/Hive logger. When set, `neo4j-driver` logging is bridged so driver messages
   * are emitted at matching logger levels (`debug` / `info` / `warn` / `error`). When omitted,
   * the driver is created without a logging bridge.
   */
  log?: Logger;
}

/**
 * Create a Neo4j driver from {@link Neo4JDriverOpts}.
 * Uses `useBigInt: true` so integer properties survive GraphQL coercion.
 */
export function getDriverFromOpts(opts: Neo4JDriverOpts) {
  return neo4j.driver(opts.endpoint, getAuthFromOpts(opts.auth), {
    useBigInt: true,
    logging: opts.log && {
      logger: (level, message) => opts.log[level](message),
    },
    trustedCertificates: [],
  });
}
