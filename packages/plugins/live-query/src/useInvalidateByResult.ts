import { getArgumentValues, getOperationAST, TypeInfo, visit, visitWithTypeInfo } from 'graphql';
import type { Plugin } from '@envelop/core';
import type { ResolverDataBasedFactory } from '@graphql-mesh/string-interpolation';
import { getInterpolatedStringFactory } from '@graphql-mesh/string-interpolation';
import type { Logger, MeshPubSub, YamlConfig } from '@graphql-mesh/types';

interface InvalidateByResultParams {
  pubsub: MeshPubSub;
  invalidations: YamlConfig.LiveQueryInvalidation[];
  logger: Logger;
}

export function useInvalidateByResult(params: InvalidateByResultParams): Plugin {
  const liveQueryInvalidationFactoryMap = new Map<string, ResolverDataBasedFactory<string>[]>();
  params.invalidations.forEach(liveQueryInvalidation => {
    const rawInvalidationPaths = liveQueryInvalidation.invalidate;
    const factories = rawInvalidationPaths.map(rawInvalidationPath =>
      getInterpolatedStringFactory(rawInvalidationPath),
    );
    liveQueryInvalidationFactoryMap.set(liveQueryInvalidation.field, factories);
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
                  params.pubsub.publish('live-query:invalidate', invalidationPaths);
                }
              },
            }),
          );
        },
      };
    },
  };
}
