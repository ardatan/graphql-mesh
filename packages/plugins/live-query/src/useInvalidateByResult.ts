import { getArgumentValues, getOperationAST, TypeInfo, visit, visitWithTypeInfo } from 'graphql';
import { type Plugin } from '@envelop/core';
import type { PubSub } from '@graphql-hive/pubsub';
import type { ResolverDataBasedFactory } from '@graphql-mesh/string-interpolation';
import { getInterpolatedStringFactory } from '@graphql-mesh/string-interpolation';
import { type YamlConfig } from '@graphql-mesh/types';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

interface InvalidateByResultParams {
  pubsub: PubSub;
  invalidations: YamlConfig.LiveQueryInvalidation[];
}

export function useInvalidateByResult(params: InvalidateByResultParams): Plugin & Disposable {
  const liveQueryInvalidationFactoryMap = new Map<string, ResolverDataBasedFactory<string>[]>();
  const timers = new Set<ReturnType<typeof setInterval>>();
  const pubsub = params.pubsub;
  if (!pubsub) {
    throw new Error(`Live Query plugin requires a pubsub instance.`);
  }
  for (const liveQueryInvalidation of params.invalidations) {
    if (liveQueryInvalidation.invalidate.length === 0) {
      continue;
    }
    const rawInvalidationPaths = liveQueryInvalidation.invalidate;
    const factories = rawInvalidationPaths.map(rawInvalidationPath =>
      getInterpolatedStringFactory(rawInvalidationPath),
    );

    // Set up polling-based invalidation if pollingInterval is provided
    if (liveQueryInvalidation.pollingInterval != null) {
      if (liveQueryInvalidation.pollingInterval <= 0) {
        throw new Error(
          `Polling interval must be a positive integer. Received: ${liveQueryInvalidation.pollingInterval}`,
        );
      }
      timers.add(
        setInterval(() => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          pubsub.publish('live-query:invalidate', liveQueryInvalidation.invalidate);
        }, liveQueryInvalidation.pollingInterval),
      );
    }

    // Set up mutation-based invalidation if field is provided
    if (liveQueryInvalidation.field != null) {
      let existingFactories = liveQueryInvalidationFactoryMap.get(liveQueryInvalidation.field);
      if (!existingFactories) {
        existingFactories = [];
        liveQueryInvalidationFactoryMap.set(liveQueryInvalidation.field, existingFactories);
      }
      existingFactories.push(...factories);
    }
  }
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
          const activePubSub = (contextValue as { pubsub?: PubSub } | undefined)?.pubsub ?? pubsub;
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
                      env: globalThis.process?.env,
                      result,
                    }),
                  );
                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  activePubSub.publish('live-query:invalidate', invalidationPaths);
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
