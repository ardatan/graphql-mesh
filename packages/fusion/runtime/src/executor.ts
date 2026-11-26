import type { DocumentNode } from 'graphql';
import { createDefaultExecutor, defaultPrintFn } from '@graphql-mesh/transport-common';
import { makeAsyncDisposable } from '@graphql-mesh/utils';
import { getBatchingExecutor } from '@graphql-tools/batch-execute';
import {
  getOperationASTFromRequest,
  isAsyncIterable,
  type ExecutionRequest,
  type ExecutionResult,
  type Executor,
  type MaybeAsyncIterable,
} from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import {
  handleMaybePromise,
  mapAsyncIterator,
  type MaybePromise,
} from '@whatwg-node/promise-helpers';
import { UnifiedGraphManager, type UnifiedGraphManagerOptions } from './unifiedGraphManager.js';

type SdkRequester = ((document: DocumentNode, variables?: any, operationContext?: any) => any) &
  AsyncDisposable;

export function getExecutorForUnifiedGraph<TContext>(opts: UnifiedGraphManagerOptions<TContext>) {
  const unifiedGraphManager = new UnifiedGraphManager(opts);
  const unifiedGraphExecutor = function unifiedGraphExecutor(execReq: ExecutionRequest) {
    const operationType = execReq.operationType ?? getOperationASTFromRequest(execReq)?.operation;
    // Subscriptions are intentionally NOT pinned — see retainGenerationFor.
    const pinGeneration = operationType !== 'subscription';

    // Capture schema/generation before context progressive-override (may be async) so
    // the same generation is used for both context SDK and execution.
    return handleMaybePromise(
      () => unifiedGraphManager.getUnifiedGraph(),
      schema => {
        const lease = pinGeneration ? unifiedGraphManager.retainGenerationFor(schema) : undefined;

        return handleMaybePromise(
          () => unifiedGraphManager.getContext(execReq.context),
          context => {
            function runWithExecutor(executor: Executor) {
              opts?.transportContext?.log.debug('Executing request on unified graph', () =>
                defaultPrintFn(execReq.document),
              );
              return handleMaybePromise(
                () =>
                  executor({
                    ...execReq,
                    context,
                  }),
                result => {
                  if (!lease) {
                    return result;
                  }
                  // Incremental (@defer/@stream) keeps the generation until the stream ends.
                  if (isAsyncIterable(result)) {
                    return mapAsyncIterator(
                      result,
                      value => value,
                      error => {
                        lease.release();
                        throw error;
                      },
                      () => {
                        lease.release();
                      },
                    );
                  }
                  lease.release();
                  return result;
                },
                error => {
                  lease?.release();
                  throw error;
                },
              );
            }

            if (lease?.executor) {
              return runWithExecutor(lease.executor);
            }
            if (!pinGeneration || !lease) {
              return handleMaybePromise(
                () => unifiedGraphManager.getExecutor(),
                executor => {
                  if (executor) {
                    return runWithExecutor(executor);
                  }
                  return runWithExecutor(createDefaultExecutor(schema));
                },
                error => {
                  lease?.release();
                  throw error;
                },
              );
            }
            return runWithExecutor(createDefaultExecutor(schema));
          },
          error => {
            lease?.release();
            throw error;
          },
        );
      },
    );
  };
  return makeAsyncDisposable(unifiedGraphExecutor, function unifiedGraphExecutorDispose() {
    opts?.transportContext?.log.debug('Disposing unified graph executor');
    return unifiedGraphManager[DisposableSymbols.asyncDispose]();
  });
}

export interface SdkRequesterOptions extends UnifiedGraphManagerOptions<any> {
  dataLoaderOptions?: Parameters<typeof getBatchingExecutor>[2];
  extensionsReducer?: (
    mergedExtensions: Record<string, any>,
    request: ExecutionRequest,
  ) => Record<string, any>;
  onExecutionRequest?(request: ExecutionRequest): MaybePromise<ExecutionRequest>;
}

const identity = <T>(x: T) => x;

export function getSdkRequesterForUnifiedGraph(opts: SdkRequesterOptions): SdkRequester {
  const unifiedGraphExecutor = getExecutorForUnifiedGraph(opts);
  const onExecutionRequest = opts.onExecutionRequest || identity;
  const sdkRequester = function sdkRequester(
    document: DocumentNode,
    variables?: any,
    operationContext?: any,
  ) {
    let executionRequest: ExecutionRequest = {
      document,
      variables,
      context: operationContext,
    };
    return handleMaybePromise(
      () => onExecutionRequest(executionRequest),
      onExecutionRequestResult => {
        if (onExecutionRequestResult != null) {
          executionRequest = onExecutionRequestResult;
        }
        const executor: Executor =
          executionRequest.context != null
            ? getBatchingExecutor(
                executionRequest.context,
                unifiedGraphExecutor,
                opts?.dataLoaderOptions,
                opts?.extensionsReducer,
              )
            : unifiedGraphExecutor;
        return handleMaybePromise(
          () => executor(executionRequest),
          handleMaybePromiseMaybeAsyncIterableResult,
        );
      },
    );
  } as SdkRequester;
  // Forward disposal so callers can release manager-owned transports/executors.
  return makeAsyncDisposable(sdkRequester, async () => {
    await unifiedGraphExecutor[DisposableSymbols.asyncDispose]();
  }) as SdkRequester;
}

export function handleMaybePromiseMaybeAsyncIterableResult<T>(
  result: MaybePromise<MaybeAsyncIterable<ExecutionResult<T>>>,
): MaybePromise<MaybeAsyncIterable<T | null>> {
  return handleMaybePromise(
    () => result,
    resolvedResult => {
      if (isAsyncIterable(resolvedResult)) {
        return mapAsyncIterator(resolvedResult, extractDataOrThrowErrors);
      }
      return extractDataOrThrowErrors(resolvedResult);
    },
  );
}

function extractDataOrThrowErrors<T>(result: ExecutionResult<T>): T | null {
  if (result.errors) {
    if (result.errors.length === 1) {
      throw result.errors[0];
    }
    throw new AggregateError(result.errors);
  }
  if (!result.data) {
    return null;
  }
  return result.data;
}
