import { isAsyncIterable, type Plugin as YogaPlugin } from 'graphql-yoga';
import type { Registry } from 'prom-client';
import { register as defaultRegistry } from 'prom-client';
import type { MeshServePlugin } from '@graphql-mesh/serve-runtime';
import type { TransportEntry } from '@graphql-mesh/transport-common';
import type {
  ImportFn,
  Logger,
  MeshFetchRequestInit,
  MeshPlugin,
  OnDelegateHookPayload,
} from '@graphql-mesh/types';
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
  usePrometheus,
} from '@graphql-yoga/plugin-prometheus';

export { createCounter, createHistogram, createSummary };
export type { CounterAndLabels, FillLabelsFnParams, HistogramAndLabels, SummaryAndLabels };

type MeshMetricsConfig = {
  delegation?:
    | boolean
    | string
    | HistogramAndLabels<string, Omit<OnDelegateHookPayload<unknown>, 'context'> | undefined>;
  /**
   * @deprecated Use `labels.delegationArgs` instead
   */
  delegationArgs?: boolean;
  /**
   * @deprecated Use `labels.delegationKey` instead
   */
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

  /**
   * @deprecated Use `labels.fetchRequestHeaders` instead
   */
  fetchRequestHeaders?: boolean;
  /**
   * @deprecated Use `labels.fetchResponseHeaders` instead
   */
  fetchResponseHeaders?: boolean;

  labels?: {
    delegationArgs?: boolean;
    delegationKey?: boolean;

    fetchRequestHeaders?: boolean;
    fetchResponseHeaders?: boolean;
  };
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
    const {
      fetchRequestHeaders = pluginOptions.fetchRequestHeaders,
      fetchResponseHeaders = pluginOptions.fetchResponseHeaders,
    } = pluginOptions.labels || {};
    if (fetchRequestHeaders) {
      labelNames.push('requestHeaders');
    }
    if (fetchResponseHeaders) {
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

              if (fetchRequestHeaders) {
                labels.requestHeaders = JSON.stringify(options.headers);
              }
              if (fetchResponseHeaders) {
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
    const {
      delegationArgs = pluginOptions.delegationArgs,
      delegationKey = pluginOptions.delegationKey,
    } = pluginOptions.labels || {};
    if (delegationArgs) {
      delegationLabelNames.push('args');
    }
    if (delegationKey) {
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
                args: delegationArgs ? JSON.stringify(args) : undefined,
                key: delegationKey ? JSON.stringify(key) : undefined,
              };
            },
          });
  }

  let subgraphExecuteHistogram: HistogramAndLabels<string, SubgraphMetricsLabelParams>;

  if (pluginOptions.subgraphExecute !== false) {
    const subgraphExecuteLabels = ['subgraphName'];
    if (pluginOptions.labels?.operationName !== false) {
      subgraphExecuteLabels.push('operationName');
    }
    if (pluginOptions.labels?.operationType !== false) {
      subgraphExecuteLabels.push('operationType');
    }
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
              labelNames: subgraphExecuteLabels,
            },
            fillLabelsFn: ({
              subgraphName,
              executionRequest: { operationType = 'query', operationName },
            }) => ({
              subgraphName,
              operationType:
                pluginOptions.labels?.operationType !== false ? operationType : undefined,
              operationName:
                pluginOptions.labels?.operationName !== false ? operationName : undefined,
            }),
          });
  }

  let subgraphExecuteErrorCounter: CounterAndLabels<string, SubgraphMetricsLabelParams>;
  if (pluginOptions.subgraphExecuteErrors !== false) {
    const subgraphExecuteErrorLabels = ['subgraphName'];
    if (pluginOptions.labels?.operationName !== false) {
      subgraphExecuteErrorLabels.push('operationName');
    }
    if (pluginOptions.labels?.operationType !== false) {
      subgraphExecuteErrorLabels.push('operationType');
    }
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
              labelNames: subgraphExecuteErrorLabels,
            },
            fillLabelsFn: ({
              subgraphName,
              executionRequest: { operationType = 'query', operationName },
            }) => ({
              subgraphName,
              operationType:
                pluginOptions.labels?.operationType !== false ? operationType : undefined,
              operationName:
                pluginOptions.labels?.operationName !== false ? operationName : undefined,
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
