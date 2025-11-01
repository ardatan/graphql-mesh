import { getArgumentValues, getOperationAST, TypeInfo, visit, visitWithTypeInfo } from 'graphql';
import { type Plugin } from '@envelop/core';
import type { ResolverDataBasedFactory } from '@graphql-mesh/string-interpolation';
import { getInterpolatedStringFactory } from '@graphql-mesh/string-interpolation';
import {
  toMeshPubSub,
  type HivePubSub,
  type Logger,
  type MeshPubSub,
  type YamlConfig,
} from '@graphql-mesh/types';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

// Hybrid type that supports both polling and mutation-based invalidation
type LiveQueryInvalidationHybrid = (
  | YamlConfig.LiveQueryInvalidationByMutation
  | YamlConfig.LiveQueryInvalidationByPolling
) & Partial<YamlConfig.LiveQueryInvalidationByMutation> & Partial<YamlConfig.LiveQueryInvalidationByPolling>;

interface InvalidateByResultParams {
  pubsub: MeshPubSub | HivePubSub;
  invalidations: LiveQueryInvalidationHybrid[];
  logger: Logger;
}

export function useInvalidateByResult(params: InvalidateByResultParams): Plugin & Disposable {
  const liveQueryInvalidationFactoryMap = new Map<string, ResolverDataBasedFactory<string>[]>();
  const timers = new Set<ReturnType<typeof setInterval>>();
  const pubsub = toMeshPubSub(params.pubsub);
  params.invalidations.forEach(liveQueryInvalidation => {
    const rawInvalidationPaths = liveQueryInvalidation.invalidate;
    const factories = rawInvalidationPaths.map(rawInvalidationPath =>
      getInterpolatedStringFactory(rawInvalidationPath),
    );

    // Set up polling-based invalidation if pollingInterval is provided
    if ('pollingInterval' in liveQueryInvalidation && liveQueryInvalidation.pollingInterval) {
      timers.add(
        setInterval(() => {
          pubsub.publish('live-query:invalidate', liveQueryInvalidation.invalidate);
        }, liveQueryInvalidation.pollingInterval),
      );
    }

    // Set up mutation-based invalidation if field is provided
    if ('field' in liveQueryInvalidation && liveQueryInvalidation.field) {
      liveQueryInvalidationFactoryMap.set(liveQueryInvalidation.field, factories);
    }
  });
  const id = pubsub.subscribe('destroy', () => {
    for (const timer of timers) {
      clearInterval(timer);
    }
    pubsub.unsubscribe(id);
  });
  return {
    onExecute() {
      return {
        onExecuteDone({ args: executionArgs, result }) {
          const { schema, document, operationName, variableValues, rootValue, contextValue } =
            executionArgs;
          const operationAST = getOperationAST(document, operationName);
          if (!operationAST) {
            throw new Error(`Operation couldn't be found`);
          }
          const typeInfo = new TypeInfo(schema);
          visit(
            operationAST,
            visitWithTypeInfo(typeInfo, {
              Field: fieldNode => {
                const parentType = typeInfo.getParentType();
                const fieldDef = typeInfo.getFieldDef();
                const path = `${parentType.name}.${fieldDef.name}`;
                if (liveQueryInvalidationFactoryMap.has(path)) {
                  const invalidationPathFactories = liveQueryInvalidationFactoryMap.get(path);
                  const args = getArgumentValues(fieldDef, fieldNode, variableValues);
                  const invalidationPaths = invalidationPathFactories.map(invalidationPathFactory =>
                    invalidationPathFactory({
                      root: rootValue,
                      args,
                      context: contextValue,
                      env: process.env,
                      result,
                    }),
                  );
                  pubsub.publish('live-query:invalidate', invalidationPaths);
                }
              },
            }),
          );
        },
      };
    },
    [DisposableSymbols.dispose]() {
      for (const timer of timers) {
        clearInterval(timer);
      }
    },
  };
}
