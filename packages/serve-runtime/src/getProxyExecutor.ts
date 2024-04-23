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
  schema?: GraphQLSchema,
): Executor {
  const fakeTransportEntryMap: Record<string, TransportEntry> = {};
  let subgraphName: string = 'upstream';
  const onSubgraphExecute = getOnSubgraphExecute({
    plugins: config.plugins?.(configContext as any) as any,
    fusiongraph: schema,
    transports() {
      if (typeof config.transport === 'object') {
        return config.transport;
      }
      if (typeof config.transport === 'function') {
        return config.transport() as any;
      }
      return defaultTransportsOption('http');
    },
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
    subgraphMap: new Proxy(new Map(), {
      get(_, subgraphNameProp: string) {
        if (subgraphNameProp === 'get') {
          return () => schema;
        }
      },
    }),
  });
  return function proxyExecutor(executionRequest) {
    return onSubgraphExecute(subgraphName, executionRequest);
  };
}
