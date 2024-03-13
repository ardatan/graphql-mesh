import { isAsyncIterable, type Plugin as YogaPlugin } from 'graphql-yoga';
import { register as defaultRegistry, Histogram, Registry } from 'prom-client';
import { MeshServePlugin } from '@graphql-mesh/serve-runtime';
import { ImportFn, Logger, MeshPlugin, YamlConfig } from '@graphql-mesh/types';
import {
  defaultImportFn,
  getHeadersObj,
  loadFromModuleExportExpression,
} from '@graphql-mesh/utils';
import { usePrometheus } from '@graphql-yoga/plugin-prometheus';

export default function useMeshPrometheus(
  pluginOptions: YamlConfig.PrometheusConfig & {
    logger?: Logger;
    baseDir?: string;
    importFn?: ImportFn;
  },
): MeshPlugin<any> & YogaPlugin & MeshServePlugin {
  let registry: Registry;
  if (pluginOptions.registry) {
    const registry$ = loadFromModuleExportExpression<Registry>(pluginOptions.registry, {
      cwd: pluginOptions.baseDir || globalThis.process?.cwd(),
      importFn: pluginOptions.importFn || defaultImportFn,
      defaultExportName: 'default',
    });
    const registryProxy = Proxy.revocable(defaultRegistry, {
      get(target, prop, receiver) {
        if (typeof (target as any)[prop] === 'function') {
          return function (...args: any[]) {
            return registry$.then(registry => (registry as any)[prop](...args));
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    registry = registryProxy.proxy;
    registry$.then(() => registryProxy.revoke()).catch(e => pluginOptions.logger.error(e));
  }

  let fetchHistogram: Histogram | undefined;

  if (pluginOptions.fetch) {
    const name =
      typeof pluginOptions.fetch === 'string' ? pluginOptions.fetch : 'graphql_mesh_fetch_duration';
    const labelNames = ['url', 'method', 'statusCode', 'statusText'];
    if (pluginOptions.fetchRequestHeaders) {
      labelNames.push('requestHeaders');
    }
    if (pluginOptions.fetchResponseHeaders) {
      labelNames.push('responseHeaders');
    }
    fetchHistogram = new Histogram({
      name,
      help: 'Time spent on outgoing HTTP calls',
      labelNames,
      registers: [registry],
    });
  }

  let delegateHistogram: Histogram | undefined;

  if (pluginOptions.delegation) {
    const name =
      typeof pluginOptions.delegation === 'string'
        ? pluginOptions.delegation
        : 'graphql_mesh_delegate_duration';
    const delegationLabelNames = ['sourceName', 'typeName', 'fieldName'];
    if (pluginOptions.delegationArgs) {
      delegationLabelNames.push('args');
    }
    if (pluginOptions.delegationKey) {
      delegationLabelNames.push('key');
    }
    delegateHistogram = new Histogram({
      name,
      help: 'Time spent on delegate execution',
      labelNames: delegationLabelNames,
      registers: [registry],
    });
  }

  let subgraphExecuteHistogram: Histogram | undefined;

  if (pluginOptions.subgraphExecute) {
    const name =
      typeof pluginOptions.subgraphExecute === 'string'
        ? pluginOptions.subgraphExecute
        : 'graphql_mesh_subgraph_execute_duration';
    const subgraphExecuteLabelNames = ['subgraphName'];
    subgraphExecuteHistogram = new Histogram({
      name,
      help: 'Time spent on subgraph execution',
      labelNames: subgraphExecuteLabelNames,
      registers: [registry],
    });
  }

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        usePrometheus({
          ...pluginOptions,
          registry,
        }),
      );
    },
    onDelegate({ sourceName, typeName, fieldName, args, key }) {
      if (delegateHistogram) {
        const start = Date.now();
        return () => {
          const end = Date.now();
          const duration = end - start;
          delegateHistogram.observe(
            {
              sourceName,
              typeName,
              fieldName,
              args: pluginOptions.delegationArgs ? JSON.stringify(args) : undefined,
              key: pluginOptions.delegationKey ? JSON.stringify(key) : undefined,
            },
            duration,
          );
        };
      }
      return undefined;
    },
    onSubgraphExecute({ subgraphName }) {
      if (subgraphExecuteHistogram) {
        const start = Date.now();
        return ({ result }) => {
          if (isAsyncIterable(result)) {
            return {
              onEnd: () => {
                const end = Date.now();
                const duration = end - start;
                subgraphExecuteHistogram.observe(
                  {
                    subgraphName,
                  },
                  duration,
                );
              },
            };
          }
          const end = Date.now();
          const duration = end - start;
          subgraphExecuteHistogram.observe(
            {
              subgraphName,
            },
            duration,
          );
          return undefined;
        };
      }
      return undefined;
    },
    onFetch({ url, options }) {
      if (fetchHistogram) {
        const start = Date.now();
        return ({ response }) => {
          const end = Date.now();
          const duration = end - start;

          const labels: Partial<Record<string, string | number>> = {
            url,
            method: options.method,
            statusCode: response.status,
            statusText: response.statusText,
          };

          if (pluginOptions.fetchRequestHeaders) {
            labels.requestHeaders = JSON.stringify(options.headers);
          }
          if (pluginOptions.fetchResponseHeaders) {
            labels.responseHeaders = JSON.stringify(getHeadersObj(response.headers));
          }

          fetchHistogram.observe(labels, duration);
        };
      }
      return undefined;
    },
  };
}
