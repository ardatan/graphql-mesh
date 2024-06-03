import { GraphQLSchema } from 'graphql';
import {
  defaultTransportsOption,
  getOnSubgraphExecute,
  TransportEntry,
} from '@graphql-mesh/fusion-runtime';
import { Executor } from '@graphql-tools/utils';
import { MeshServeConfigContext, MeshServeConfigWithProxy } from './types.js';

export function getProxyExecutor<TContext>(
  config: MeshServeConfigWithProxy<TContext>,
  configContext: MeshServeConfigContext,
  getSchema: () => GraphQLSchema,
): Executor {
  const fakeTransportEntryMap: Record<string, TransportEntry> = {};
  let subgraphName: string = 'upstream';
  const onSubgraphExecute = getOnSubgraphExecute({
    plugins: config.plugins?.(configContext as any) as any,
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
    transportBaseContext: configContext,
    getSubgraphSchema: getSchema,
  });
  return function proxyExecutor(executionRequest) {
    return onSubgraphExecute(subgraphName, executionRequest);
  };
}
