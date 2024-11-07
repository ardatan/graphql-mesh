import type { DocumentNode } from 'graphql';
import { createDefaultExecutor } from '@graphql-mesh/transport-common';
import { mapMaybePromise } from '@graphql-mesh/utils';
import {
  isAsyncIterable,
  mapAsyncIterator,
  type DisposableExecutor,
  type ExecutionRequest,
  type ExecutionResult,
  type MaybePromise,
} from '@graphql-tools/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { UnifiedGraphManager, type UnifiedGraphManagerOptions } from './unifiedGraphManager.js';

type SdkRequester = (document: DocumentNode, variables?: any, operationContext?: any) => any;

export function getExecutorForUnifiedGraph<TContext>(opts: UnifiedGraphManagerOptions<TContext>) {
  const unifiedGraphManager = new UnifiedGraphManager(opts);
  const unifiedGraphExecutor = function unifiedGraphExecutor(execReq: ExecutionRequest) {
    return mapMaybePromise(unifiedGraphManager.getContext(execReq.context), context => {
      return mapMaybePromise(unifiedGraphManager.getUnifiedGraph(), unifiedGraph =>
        createDefaultExecutor(unifiedGraph)({
          ...execReq,
          context,
        }),
      );
    });
  };
  unifiedGraphExecutor[DisposableSymbols.asyncDispose] = function unifiedGraphExecutorDispose() {
    return unifiedGraphManager[DisposableSymbols.asyncDispose]();
  };
  return unifiedGraphExecutor as DisposableExecutor<TContext>;
}

export function getSdkRequesterForUnifiedGraph(
  opts: UnifiedGraphManagerOptions<any>,
): SdkRequester {
  const unifiedGraphExecutor = getExecutorForUnifiedGraph(opts);
  return function sdkRequester(document: DocumentNode, variables?: any, operationContext?: any) {
    return mapMaybePromise(
      unifiedGraphExecutor({
        document,
        variables,
        context: operationContext,
      }),
      result => {
        if (isAsyncIterable(result)) {
          return mapAsyncIterator(result, extractDataOrThrowErrors);
        }
        return extractDataOrThrowErrors(result);
      },
    );
  };
}

function extractDataOrThrowErrors<T>(result: ExecutionResult<T>): T {
  if (result.errors) {
    if (result.errors.length === 1) {
      throw result.errors[0];
    }
    throw new AggregateError(result.errors);
  }
  return result.data;
}
