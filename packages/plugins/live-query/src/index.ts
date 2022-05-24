import { useLiveQuery } from '@envelop/live-query';
import { MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { getInterpolatedStringFactory, ResolverDataBasedFactory } from '@graphql-mesh/string-interpolation';
import { InMemoryLiveQueryStore } from '@n1ru4l/in-memory-live-query-store';
import { useEnvelop, envelop, Plugin } from '@envelop/core';
import { getOperationAST, TypeInfo, visit, visitWithTypeInfo } from 'graphql';

export default function useMeshLiveQuery(options: MeshPluginOptions<YamlConfig.LiveQueryConfig>): Plugin {
  const liveQueryInvalidationFactoryMap = new Map<string, ResolverDataBasedFactory<string>[]>();
  options.logger.debug(() => `Creating Live Query Store`);
  const liveQueryStore = new InMemoryLiveQueryStore({
    includeIdentifierExtension: true,
  });
  options.liveQueryInvalidations?.forEach(liveQueryInvalidation => {
    const rawInvalidationPaths = liveQueryInvalidation.invalidate;
    const factories = rawInvalidationPaths.map(rawInvalidationPath =>
      getInterpolatedStringFactory(rawInvalidationPath)
    );
    liveQueryInvalidationFactoryMap.set(liveQueryInvalidation.field, factories);
  });
  return useEnvelop(
    envelop({
      plugins: [
        useLiveQuery({ liveQueryStore }),
        {
          onExecute(onExecuteParams) {
            if (!onExecuteParams.args.schema.getDirective('live')) {
              options.logger.warn(`You have to add @live directive to additionalTypeDefs to enable Live Queries
See more at https://www.graphql-mesh.com/docs/recipes/live-queries`);
            }
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
                          liveQueryStore
                            .invalidate(invalidationPaths)
                            .catch((e: Error) => options.logger.warn(`Invalidation failed for ${path}: ${e.message}`));
                        }
                      },
                    })
                  );
                });
              },
            };
          },
        },
      ],
    })
  );
}
