import type { GraphQLSchema } from 'graphql';
import type { OnSubgraphExecuteHook, TransportEntry } from '@graphql-mesh/fusion-runtime';
import { getOnSubgraphExecute } from '@graphql-mesh/fusion-runtime';
import type { Executor } from '@graphql-tools/utils';
import type { MeshServeConfigContext, MeshServeConfigWithProxy } from './types.js';

export function getProxyExecutor<TContext>({
  config,
  configContext,
  getSchema,
  onSubgraphExecuteHooks,
  disposableStack,
}: {
  config: MeshServeConfigWithProxy<TContext>;
  configContext: MeshServeConfigContext;
  getSchema: () => GraphQLSchema;
  onSubgraphExecuteHooks: OnSubgraphExecuteHook[];
  disposableStack: AsyncDisposableStack;
}): Executor {
  const fakeTransportEntryMap: Record<string, TransportEntry> = {};
  let subgraphName: string = 'upstream';
  const onSubgraphExecute = getOnSubgraphExecute({
    onSubgraphExecuteHooks,
    transportEntryMap: new Proxy(fakeTransportEntryMap, {
      get(fakeTransportEntryMap, subgraphNameProp: string): TransportEntry {
        if (!fakeTransportEntryMap[subgraphNameProp]) {
          subgraphName = subgraphNameProp;
          fakeTransportEntryMap[subgraphNameProp] = {
            kind: 'http',
            subgraph: subgraphName.toString(),
            location: config.proxy?.endpoint,
            headers: config.proxy?.headers as any,
            options: config.proxy,
          };
        }
        return fakeTransportEntryMap[subgraphNameProp];
      },
    }),
    transportContext: configContext,
    getSubgraphSchema: getSchema,
    transportExecutorStack: disposableStack,
  });
  return function proxyExecutor(executionRequest) {
    return onSubgraphExecute(subgraphName, executionRequest);
  };
}
