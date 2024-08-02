import { isAsyncIterable, type Plugin as YogaPlugin } from 'graphql-yoga';
import type { Registry } from 'prom-client';
import { register as defaultRegistry } from 'prom-client';
import type { MeshServePlugin } from '@graphql-mesh/serve-runtime';
import type { TransportEntry } from '@graphql-mesh/transport-common';
import type { ImportFn, Logger, MeshFetchRequestInit, MeshPlugin } from '@graphql-mesh/types';
import {
  defaultImportFn,
  getHeadersObj,
  loadFromModuleExportExpression,
} from '@graphql-mesh/utils';
import type { ExecutionRequest } from '@graphql-tools/utils';
import type {
  CounterAndLabels,
  FillLabelsFnParams,
  HistogramAndLabels,
  PrometheusTracingPluginConfig,
  SummaryAndLabels,
} from '@graphql-yoga/plugin-prometheus';
import {
  createCounter,
  createHistogram,
  createSummary,
  getCounterFromConfig,
  getHistogramFromConfig,
  usePrometheus,
} from '@graphql-yoga/plugin-prometheus';

export { createCounter, createHistogram, createSummary };
export type { CounterAndLabels, FillLabelsFnParams, HistogramAndLabels, SummaryAndLabels };

type MeshMetricsConfig = {
  metrics: {
    /**
     * Tracks the duration of outgoing HTTP requests.
     * It reports the time spent on each request made using the `fetch` function provided by Mesh.
     * It is reported as an histogram.
     *
     * You can pass multiple type of values:
     *  - boolean: Disable or Enable the metric with default configuration
     *  - string: Enable the metric with custom name
     *  - number[]: Enable the metric with custom buckets
     *  - ReturnType<typeof createHistogram>: Enable the metric with custom configuration
     */
    graphql_mesh_fetch_duration:
      | boolean
      | string
      | number[]
      | HistogramAndLabels<
          string,
          { url: string; options: MeshFetchRequestInit; response: Response }
        >;

    /**
     * Tracks the duration of subgraph execution.
     * It reports the time spent on each subgraph queries made to resolve incoming operations as an
     * histogram.
     *
     * You can pass multiple type of values:
     *  - boolean: Disable or Enable the metric with default configuration
     *  - string: Enable the metric with custom name
     *  - number[]: Enable the metric with custom buckets
     *  - ReturnType<typeof createHistogram>: Enable the metric with custom configuration
     */
    graphql_mesh_subgraph_execute_duration:
      | boolean
      | string
      | number[]
      | HistogramAndLabels<'subgraphName' | 'operationType', SubgraphMetricsLabelParams>;

    /**
     * This metric tracks the number of errors that occurred during the subgraph execution.
     * It counts all errors found in the response returned by the subgraph execution.
     * It is exposed as a counter
     */
    graphql_mesh_subgraph_execute_errors:
      | boolean
      | string
      | CounterAndLabels<'subgraphName' | 'operationType', SubgraphMetricsLabelParams>;
  };

  labels?: {
    /**
     * The name of the targeted subgraph.
     */
    subgraphName?: boolean;
    /**
     * The type of the GraphQL operation executed by the subgraph.
     *
     * The headers to include in the label can be specified as an array of strings.
     */
    fetchRequestHeaders?: boolean | string[];
    /**
     * The name of the GraphQL operation executed by the subgraph.
     *
     * The headers to include in the label can be specified as an array of strings.
     */
    fetchResponseHeaders?: boolean | string[];
  };

  /**
   * The logger instance used by the plugin to log messages.
   * This should be the logger instance provided by Mesh in the plugins context.
   */
  logger: Logger;
};

type PrometheusPluginOptions = PrometheusTracingPluginConfig & MeshMetricsConfig;

type YamlConfig = {
  baseDir?: string;
  importFn?: ImportFn;
  registry?: Registry | string;
};

type SubgraphMetricsLabelParams = {
  subgraphName: string;
  transportEntry?: TransportEntry;
  executionRequest: ExecutionRequest;
};

export default function useMeshPrometheus(
  pluginOptions: Omit<
    PrometheusPluginOptions,
    // Remove this after Mesh v1 is released;
    'registry'
  > &
    YamlConfig, // Remove this after Mesh v1 is released,
): MeshPlugin<any> & YogaPlugin & MeshServePlugin {
  let registry: Registry;
  if (!pluginOptions.registry) {
    registry = defaultRegistry;
  } else if (typeof pluginOptions.registry !== 'string') {
    registry = pluginOptions.registry;
  } else {
    // TODO: Remove this once Mesh v1 is released
    //       Mesh v1 config is now a TS config file, we don't need to load it from a string anymore
    registry = registryFromYamlConfig(pluginOptions);
  }

  const config = { ...pluginOptions, registry };

  const fetchLabelNames = [
    'url',
    'method',
    'statusCode',
    'statusText',
    'requestHeaders',
    'responseHeaders',
  ];
  // Since request and response headers can be large, they are disabled by default
  const { fetchRequestHeaders, fetchResponseHeaders } = pluginOptions.labels ?? {};
  if (fetchRequestHeaders) {
    fetchLabelNames.push('requestHeaders');
  }
  if (fetchResponseHeaders) {
    fetchLabelNames.push('responseHeaders');
  }

  const fetchHistogram: HistogramAndLabels<
    string,
    { url: string; options: MeshFetchRequestInit; response: Response }
  > = getHistogramFromConfig(
    config,
    'graphql_mesh_fetch_duration',
    {
      labelNames: fetchLabelNames,
      help: 'Time spent on outgoing HTTP calls',
    },
    ({ url, options, response }) => {
      const labels: Record<string, string | number> = {
        url,
        method: options.method,
        statusCode: response.status,
        statusText: response.statusText,
      };

      if (fetchRequestHeaders) {
        labels.requestHeaders = JSON.stringify(filterHeaders(fetchRequestHeaders, options.headers));
      }
      if (fetchResponseHeaders) {
        labels.responseHeaders = JSON.stringify(
          filterHeaders(fetchResponseHeaders, getHeadersObj(response.headers)),
        );
      }
      return labels;
    },
  );

  const subgraphExecuteHistogram: HistogramAndLabels<string, SubgraphMetricsLabelParams> =
    getHistogramFromConfig(
      config,
      'graphql_mesh_subgraph_execute_duration',
      {
        labelNames: ['subgraphName', 'operationName', 'operationType'],
        help: 'Time spent on subgraph execution',
      },
      ({ subgraphName, executionRequest }) => ({
        subgraphName,
        operationName: executionRequest.operationName || 'Anonymous',
        operationType: executionRequest.operationType || 'query',
      }),
    );

  const subgraphExecuteErrorCounter: CounterAndLabels<string, SubgraphMetricsLabelParams> =
    getCounterFromConfig(
      config,
      'graphql_mesh_subgraph_execute_errors',
      {
        labelNames: ['subgraphName', 'operationName', 'operationType'],
        help: 'Number of errors on subgraph execution',
      },
      ({ subgraphName, executionRequest }) => ({
        subgraphName,
        operationName: executionRequest.operationName || 'Anonymous',
        operationType: executionRequest.operationType || 'query',
      }),
    );

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(usePrometheus(config));
    },
    onSubgraphExecute(payload) {
      if (subgraphExecuteHistogram) {
        const start = Date.now();
        return ({ result }) => {
          if (isAsyncIterable(result)) {
            return {
              onNext({ result }) {
                if (result.errors) {
                  result.errors.forEach(() => {
                    subgraphExecuteErrorCounter?.counter.inc(
                      subgraphExecuteErrorCounter.fillLabelsFn(
                        payload,
                        payload.executionRequest.context,
                      ),
                    );
                  });
                }
              },
              onEnd: () => {
                const end = Date.now();
                const duration = (end - start) / 1000;
                subgraphExecuteHistogram.histogram.observe(
                  subgraphExecuteHistogram.fillLabelsFn(payload, payload.executionRequest.context),
                  duration,
                );
              },
            };
          }
          if (result.errors) {
            result.errors.forEach(() => {
              subgraphExecuteErrorCounter?.counter.inc(
                subgraphExecuteErrorCounter.fillLabelsFn(payload, payload.executionRequest.context),
              );
            });
          }
          const end = Date.now();
          const duration = (end - start) / 1000;
          subgraphExecuteHistogram.histogram.observe(
            subgraphExecuteHistogram.fillLabelsFn(payload, payload.executionRequest.context),
            duration,
          );
          return undefined;
        };
      }
      return undefined;
    },
    onFetch({ url, options, context }) {
      if (fetchHistogram) {
        const start = Date.now();
        return ({ response }) => {
          const end = Date.now();
          const duration = (end - start) / 1000;

          fetchHistogram.histogram.observe(
            fetchHistogram.fillLabelsFn({ url, options, response }, context),
            duration,
          );
        };
      }
      return undefined;
    },
  };
}

function registryFromYamlConfig(config: YamlConfig & { logger: Logger }): Registry {
  const registry$ = loadFromModuleExportExpression<Registry>(config.registry, {
    cwd: config.baseDir || globalThis.process?.cwd(),
    importFn: config.importFn || defaultImportFn,
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

  registry$.then(() => registryProxy.revoke()).catch(e => config.logger.error(e));

  return registryProxy.proxy;
}

function filterHeaders(allowList: string[] | unknown, headers: Record<string, string>) {
  return Array.isArray(allowList)
    ? Object.fromEntries(Object.entries(headers).filter(([key]) => allowList.includes(key)))
    : headers;
}
