import { Plugin } from '@envelop/core';
import { getInterpolatedStringFactory, ResolverDataBasedFactory } from '@graphql-mesh/string-interpolation';
import { Logger, YamlConfig } from '@graphql-mesh/types';
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { getOperationAST, TypeInfo, visit, visitWithTypeInfo } from 'graphql';

interface InvalidateByResultParams {
  liveQueryStore: InMemoryLiveQueryStore;
  invalidations: YamlConfig.LiveQueryInvalidation[];
  logger: Logger;
}

export function useInvalidateByResult(params: InvalidateByResultParams): Plugin {
  const liveQueryInvalidationFactoryMap = new Map<string, ResolverDataBasedFactory<string>[]>();
  params.invalidations.forEach(liveQueryInvalidation => {
    const rawInvalidationPaths = liveQueryInvalidation.invalidate;
    const factories = rawInvalidationPaths.map(rawInvalidationPath =>
      getInterpolatedStringFactory(rawInvalidationPath)
    );
    liveQueryInvalidationFactoryMap.set(liveQueryInvalidation.field, factories);
  });
  return {
    onExecute() {
      return {
        onExecuteDone({ args: executionArgs, result }) {
          queueMicrotask(() => {
            const { schema, document, operationName, rootValue, contextValue } = executionArgs;
            const operationAST = getOperationAST(document, operationName);
            if (!operationAST) {
              throw new Error(`Operation couldn't be found`);
            }
            const typeInfo = new TypeInfo(schema);
            visit(
              operationAST,
              visitWithTypeInfo(typeInfo, {
                Field: () => {
                  const parentType = typeInfo.getParentType();
                  const fieldDef = typeInfo.getFieldDef();
                  const path = `${parentType.name}.${fieldDef.name}`;
                  if (liveQueryInvalidationFactoryMap.has(path)) {
                    const invalidationPathFactories = liveQueryInvalidationFactoryMap.get(path);
                    const invalidationPaths = invalidationPathFactories.map(invalidationPathFactory =>
                      invalidationPathFactory({
                        root: rootValue,
                        context: contextValue,
                        env: process.env,
                        result,
                      })
                    );
                    params.liveQueryStore
                      .invalidate(invalidationPaths)
                      .catch((e: Error) => params.logger.warn(`Invalidation failed for ${path}: ${e.message}`));
                  }
                },
              })
            );
          });
        },
      };
    },
  };
}
