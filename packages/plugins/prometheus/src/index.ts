import { usePrometheus } from '@envelop/prometheus';
import { MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { getHeadersObj, loadFromModuleExportExpression } from '@graphql-mesh/utils';
import { Histogram, register as defaultRegistry, Registry } from 'prom-client';

export default async function useMeshPrometheus(
  pluginOptions: MeshPluginOptions<YamlConfig.PrometheusConfig>
): Promise<MeshPlugin<any>> {
  const registry = pluginOptions.registry
    ? await loadFromModuleExportExpression<Registry>(pluginOptions.registry, {
        cwd: pluginOptions.baseDir,
        importFn: pluginOptions.importFn,
        defaultExportName: 'default',
      })
    : defaultRegistry;
  const fetchHistogram = new Histogram({
    name: 'graphql_mesh_fetch_duration',
    help: 'Time spent on outgoing HTTP calls',
    labelNames: ['url', 'method', 'requestHeaders', 'statusCode', 'statusText', 'responseHeaders'],
    registers: [registry],
  });
  const delegateHistogram = new Histogram({
    name: 'graphql_mesh_delegate_duration',
    help: 'Time spent on delegate execution',
    labelNames: ['sourceName', 'typeName', 'fieldName', 'args', 'key'],
    registers: [registry],
  });
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        usePrometheus({
          ...pluginOptions,
          registry,
        })
      );
    },
    onDelegate({ sourceName, typeName, fieldName, args, key }) {
      if (pluginOptions.delegation !== false) {
        const start = Date.now();
        return () => {
          const end = Date.now();
          const duration = end - start;
          delegateHistogram.observe(
            {
              sourceName,
              typeName,
              fieldName,
              args: JSON.stringify(args),
              key: JSON.stringify(key),
            },
            duration
          );
        };
      }
      return undefined;
    },
    onFetch({ url, options }) {
      if (pluginOptions.fetch !== false) {
        const start = Date.now();
        return ({ response }) => {
          const end = Date.now();
          const duration = end - start;
          fetchHistogram.observe(
            {
              url,
              method: options.method,
              requestHeaders: JSON.stringify(options.headers),
              statusCode: response.status,
              statusText: response.statusText,
              responseHeaders: JSON.stringify(getHeadersObj(response.headers)),
            },
            duration
          );
        };
      }
      return undefined;
    },
  };
}
