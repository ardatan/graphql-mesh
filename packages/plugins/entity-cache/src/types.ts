import type { ExecutionResult, FieldNode, GraphQLSchema } from 'graphql';
import type { ExecutionRequest, Executor } from '@graphql-tools/utils';

// #9658: storage must fence writes atomically; a plain KeyValueCache cannot promise this.
export interface EntityStore {
  snapshot(partition: string, identities: string[]): Promise<string[]>;
  read(keys: string[]): Promise<Array<EntityEntry | null>>;
  write(
    key: string,
    entry: EntityEntry,
    ttlSeconds: number,
    partition: string,
    identity: string,
    stamp: string,
  ): Promise<boolean | 'rejected'>;
  invalidate(partition: string, identities?: string[]): Promise<void>;
}

export interface EntityEntry {
  rows: unknown[];
  expiresAt: number;
}
export interface BatchMapping {
  keys: string[];
  /** Keys are interchangeable lookup inputs, not a collection. Full-key args must round-trip. */
  withKeys(keys: string[]): Record<string, unknown>;
}
export interface EntityRule {
  source: string;
  field: string;
  /** Stable schema/config identity, changed when policy or upstream semantics change. */
  revision: string;
  entityType: string;
  ttlSeconds: number;
  negativeTtlSeconds?: number;
  maxBatchSize?: number;
  /** Explicit authorization partition. Return null to bypass. Never pass a raw token. */
  scope(request: ExecutionRequest): string | null;
  batch(args: Record<string, unknown>): BatchMapping | null;
  identity(row: unknown): string | null;
  /** Explicit proof of complete identity groups, including missing keys. Missing proof bypasses caching.
   * Paginated sources must reject saturated/truncated results, even if every returned key is valid. */
  isComplete?(
    rows: readonly unknown[],
    requestedKeys: readonly string[],
    args: Record<string, unknown>,
  ): boolean;
  /** Optional scalar key to request internally when stitching omits it from the delegated selection. */
  identityField?: string;
  /** Explicit proof that this selection is public or valid in the chosen scope. */
  selection(field: FieldNode, schema: GraphQLSchema): boolean;
  /** Explicit contract: unique lookup keys, grouped rows, requested-key order. */
  ordering: 'key-grouped';
  mutationFields?: string[];
}
export interface EntityInvalidation {
  source: string;
  entityType: string;
  scope: string;
  identities?: string[];
}
export interface EntityCacheMetrics {
  hits: number;
  misses: number;
  coalesced: number;
  upstreamCalls: number;
  writes: number;
  fencedWrites: number;
  admissionRejected: number;
  invalidations: number;
  cacheErrors: number;
  bypasses: number;
}
export type EntityExecutor = Executor;
export type EntityResult = ExecutionResult;
