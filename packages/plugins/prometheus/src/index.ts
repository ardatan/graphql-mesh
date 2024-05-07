import { isAsyncIterable, type Plugin as YogaPlugin } from 'graphql-yoga';
import { register as defaultRegistry, Registry } from 'prom-client';
import { MeshServePlugin } from '@graphql-mesh/serve-runtime';
import type { TransportEntry } from '@graphql-mesh/transport-common';
import {
  Logger,
  MeshPlugin,
  type ImportFn,
  type MeshFetchRequestInit,
  type OnDelegateHookPayload,
} from '@graphql-mesh/types';
import {
  defaultImportFn,
  getHeadersObj,
  loadFromModuleExportExpression,
} from '@graphql-mesh/utils';
import type { ExecutionRequest } from '@graphql-tools/utils';
import type {
  CounterAndLabels,
  HistogramAndLabels,
  PrometheusTracingPluginConfig,
} from '@graphql-yoga/plugin-prometheus';
import { createCounter, createHistogram, usePrometheus } from '@graphql-yoga/plugin-prometheus';

type MeshMetricsConfig = {
  delegation?:
    | boolean
    | string
    | HistogramAndLabels<string, Omit<OnDelegateHookPayload<unknown>, 'context'> | undefined>;
  delegationArgs?: boolean;
  delegationKey?: boolean;

  subgraphExecute?:
    | boolean
    | string
    | HistogramAndLabels<'subgraphName' | 'operationType', SubgraphMetricsLabelParams>;

  subgraphExecuteErrors?:
    | boolean
    | string
    | CounterAndLabels<'subgraphName' | 'operationType', SubgraphMetricsLabelParams>;

  fetchMetrics?:
    | boolean
    | string
    | HistogramAndLabels<
        string,
        { url: string; options: MeshFetchRequestInit; response: Response }
      >;
  fetchRequestHeaders?: boolean;
  fetchResponseHeaders?: boolean;
};

type PrometheusPluginOptions = Omit<
  PrometheusTracingPluginConfig,
  // Remove this after Mesh v1 is released;
  'registry'
> &
  YamlConfig & // Remove this after Mesh v1 is released;
  MeshMetricsConfig & {
    logger?: Logger;
  };

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
  pluginOptions: PrometheusPluginOptions,
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

  let fetchHistogram: HistogramAndLabels<
    string,
    { url: string; options: MeshFetchRequestInit; response: Response }
  >;

  if (pluginOptions.fetchMetrics) {
    const labelNames = ['url', 'method', 'statusCode', 'statusText'];
    if (pluginOptions.fetchRequestHeaders) {
      labelNames.push('requestHeaders');
    }
    if (pluginOptions.fetchResponseHeaders) {
      labelNames.push('responseHeaders');
    }

    fetchHistogram =
      typeof pluginOptions.fetchMetrics === 'object'
        ? pluginOptions.fetchMetrics
        : createHistogram({
            registry,
            histogram: {
              name:
                typeof pluginOptions.fetchMetrics === 'string'
                  ? pluginOptions.fetchMetrics
                  : 'graphql_mesh_fetch_duration',
              help: 'Time spent on outgoing HTTP calls',
              labelNames,
            },
            fillLabelsFn: ({ url, options, response }) => {
              const labels: Record<string, string | number> = {
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
              return labels;
            },
          });
  }

  let delegateHistogram: HistogramAndLabels<
    string,
    Omit<OnDelegateHookPayload<unknown>, 'context'> | undefined
  >;

  if (pluginOptions.delegation) {
    const delegationLabelNames = ['sourceName', 'typeName', 'fieldName'];
    if (pluginOptions.delegationArgs) {
      delegationLabelNames.push('args');
    }
    if (pluginOptions.delegationKey) {
      delegationLabelNames.push('key');
    }
    delegateHistogram =
      typeof pluginOptions.delegation === 'object'
        ? pluginOptions.delegation
        : createHistogram({
            registry,
            histogram: {
              name:
                typeof pluginOptions.delegation === 'string'
                  ? pluginOptions.delegation
                  : 'graphql_mesh_delegate_duration',
              help: 'Time spent on delegate execution',
              labelNames: delegationLabelNames,
            },
            fillLabelsFn: ({ sourceName, typeName, fieldName, args, key }) => {
              return {
                sourceName,
                typeName,
                fieldName,
                args: pluginOptions.delegationArgs ? JSON.stringify(args) : undefined,
                key: pluginOptions.delegationKey ? JSON.stringify(key) : undefined,
              };
            },
          });
  }

  let subgraphExecuteHistogram: HistogramAndLabels<
    'subgraphName' | 'operationType',
    SubgraphMetricsLabelParams
  >;

  if (pluginOptions.subgraphExecute !== false) {
    subgraphExecuteHistogram =
      typeof pluginOptions.subgraphExecute === 'object'
        ? pluginOptions.subgraphExecute
        : createHistogram({
            registry,
            histogram: {
              name:
                typeof pluginOptions.subgraphExecute === 'string'
                  ? pluginOptions.subgraphExecute
                  : 'graphql_mesh_subgraph_execute_duration',
              help: 'Time spent on subgraph execution',
              labelNames: ['subgraphName', 'operationType'],
            },
            fillLabelsFn: ({ subgraphName, executionRequest: { operationType = 'query' } }) => ({
              subgraphName,
              operationType,
            }),
          });
  }

  let subgraphExecuteErrorCounter: CounterAndLabels<
    'subgraphName' | 'operationType',
    SubgraphMetricsLabelParams
  >;
  if (pluginOptions.subgraphExecuteErrors !== false) {
    subgraphExecuteErrorCounter =
      typeof pluginOptions.subgraphExecuteErrors === 'object'
        ? pluginOptions.subgraphExecuteErrors
        : createCounter({
            registry,
            counter: {
              name:
                typeof pluginOptions.subgraphExecuteErrors === 'string'
                  ? pluginOptions.subgraphExecuteErrors
                  : `graphql_mesh_subgraph_execute_errors`,
              help: 'Number of errors on subgraph execution',
              labelNames: ['subgraphName', 'operationType'],
            },
            fillLabelsFn: ({ subgraphName, executionRequest: { operationType = 'query' } }) => ({
              subgraphName,
              operationType,
            }),
          });
  }

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        // TODO: fix usePrometheus typings to inherit the context
        usePrometheus({
          ...pluginOptions,
          registry,
        }) as any,
      );
    },
    onDelegate({ context, ...payload }) {
      if (delegateHistogram) {
        const start = Date.now();
        return () => {
          const end = Date.now();
          const duration = end - start;
          delegateHistogram.histogram.observe(
            delegateHistogram.fillLabelsFn(payload, context),
            duration,
          );
        };
      }
      return undefined;
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
                const duration = end - start;
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
          const duration = end - start;
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
          const duration = end - start;

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

function registryFromYamlConfig(pluginOptions: PrometheusPluginOptions): Registry {
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

  registry$.then(() => registryProxy.revoke()).catch(e => pluginOptions.logger.error(e));

  return registryProxy.proxy;
}
