import type DataLoader from 'dataloader';
import type { ExecutionRequest, Executor } from '@graphql-tools/utils';
import { createBatchingExecutor } from './createBatchingExecutor.js';

/**
 * Cache: context → executor → deferFlag → batching executor.
 *
 * `memoize2of5` only WeakMap-keys the first two args and ignores the rest, so a
 * boolean `defer` cannot participate in that helper. Use an explicit Map for
 * the defer flag (and keep object identity for context/executor).
 */
const cache = new WeakMap<Record<string, any>, WeakMap<Executor, Map<string, Executor>>>();

export function getBatchingExecutor(
  context: Record<string, any>,
  executor: Executor,
  dataLoaderOptions?: DataLoader.Options<any, any, any> | undefined,
  extensionsReducer?:
    | undefined
    | ((mergedExtensions: Record<string, any>, request: ExecutionRequest) => Record<string, any>),
  defer?: boolean,
): Executor {
  let byExecutor = cache.get(context);
  if (!byExecutor) {
    byExecutor = new WeakMap();
    cache.set(context, byExecutor);
  }

  let byDefer = byExecutor.get(executor);
  if (!byDefer) {
    byDefer = new Map();
    byExecutor.set(executor, byDefer);
  }

  // Primitive-safe key — WeakMap cannot hold `true`/`false`.
  const deferKey = defer ? '1' : '0';
  let batchingExecutor = byDefer.get(deferKey);
  if (!batchingExecutor) {
    batchingExecutor = createBatchingExecutor(
      executor,
      dataLoaderOptions,
      extensionsReducer,
      defer,
    );
    byDefer.set(deferKey, batchingExecutor);
  }
  return batchingExecutor;
}
