import type { Plugin as YogaPlugin } from 'graphql-yoga';
import { Counter, register as defaultRegistry, Histogram, Registry, Summary } from 'prom-client';
import { MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { getHeadersObj, loadFromModuleExportExpression } from '@graphql-mesh/utils';
import {
  usePrometheus,
  PrometheusTracingPluginConfig as YogaPromPluginConfig,
} from '@graphql-yoga/plugin-prometheus';
import {
  commonFillLabelsFnForEnvelop,
  commonLabelsForEnvelop,
  createHistogramForEnvelop,
} from './createHistogramForEnvelop.js';

type HistogramContainer = Exclude<YogaPromPluginConfig['http'], boolean>;
type CounterContainer = Exclude<YogaPromPluginConfig['requestCount'], boolean>;
type SummaryContainer = Exclude<YogaPromPluginConfig['requestSummary'], boolean>;

export default async function useMeshPrometheus(
  pluginOptions: MeshPluginOptions<YamlConfig.PrometheusConfig>,
): Promise<MeshPlugin<any> & YogaPlugin> {
  const registry = pluginOptions.registry
    ? await loadFromModuleExportExpression<Registry>(pluginOptions.registry, {
        cwd: pluginOptions.baseDir,
        importFn: pluginOptions.importFn,
        defaultExportName: 'default',
      })
    : defaultRegistry;

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
    delegateHistogram = new Histogram({
      name,
      help: 'Time spent on delegate execution',
      labelNames: ['sourceName', 'typeName', 'fieldName', 'args', 'key'],
      registers: [registry],
    });
  }

  let httpHistogram: HistogramContainer | undefined;

  if (pluginOptions.http) {
    const labelNames = ['url', 'method', 'statusCode', 'statusText'];
    if (pluginOptions.httpRequestHeaders) {
      labelNames.push('requestHeaders');
    }
    if (pluginOptions.httpResponseHeaders) {
      labelNames.push('responseHeaders');
    }
    const name =
      typeof pluginOptions.http === 'string' ? pluginOptions.http : 'graphql_mesh_http_duration';
    httpHistogram = {
      histogram: new Histogram({
        name,
        help: 'Time spent on incoming HTTP requests',
        labelNames,
        registers: [registry],
      }),
      fillLabelsFn(_, { request, response }) {
        const labels: Record<string, string> = {
          url: request.url,
          method: request.method,
          statusCode: response.status,
          statusText: response.statusText,
        };
        if (pluginOptions.httpRequestHeaders) {
          labels.requestHeaders = JSON.stringify(getHeadersObj(request.headers));
        }
        if (pluginOptions.httpResponseHeaders) {
          labels.responseHeaders = JSON.stringify(getHeadersObj(response.headers));
        }
        return labels;
      },
    };
  }

  let requestCounter: CounterContainer | undefined;

  if (pluginOptions.requestCount) {
    const name =
      typeof pluginOptions.requestCount === 'string'
        ? pluginOptions.requestCount
        : 'graphql_mesh_request_count';
    requestCounter = {
      counter: new Counter({
        name,
        help: 'Counts the amount of GraphQL requests executed',
        labelNames: commonLabelsForEnvelop,
        registers: [registry],
      }),
      fillLabelsFn: commonFillLabelsFnForEnvelop,
    };
  }

  let requestSummary: SummaryContainer | undefined;

  if (pluginOptions.requestSummary) {
    const name =
      typeof pluginOptions.requestSummary === 'string'
        ? pluginOptions.requestSummary
        : 'graphql_mesh_request_time_summary';
    requestSummary = {
      summary: new Summary({
        name,
        help: 'Summary to measure the time to complete GraphQL operations',
        labelNames: commonLabelsForEnvelop,
        registers: [registry],
      }),
      fillLabelsFn: commonFillLabelsFnForEnvelop,
    };
  }

  let errorsCounter: CounterContainer | undefined;

  if (pluginOptions.errors) {
    const name =
      typeof pluginOptions.errors === 'string' ? pluginOptions.errors : 'graphql_mesh_error_result';
    errorsCounter = {
      counter: new Counter({
        name,
        help: 'Counts the amount of errors reported from all phases',
        labelNames: ['operationType', 'operationName', 'path', 'phase'] as const,
        registers: [registry],
      }),
      fillLabelsFn: params => ({
        operationName: params.operationName!,
        operationType: params.operationType!,
        path: params.error?.path?.join('.'),
        phase: params.errorPhase!,
      }),
    };
  }

  let deprecatedCounter: CounterContainer | undefined;

  if (pluginOptions.deprecatedFields) {
    const name =
      typeof pluginOptions.deprecatedFields === 'string'
        ? pluginOptions.deprecatedFields
        : 'graphql_mesh_deprecated_fields';
    deprecatedCounter = {
      counter: new Counter({
        name,
        help: 'Counts the amount of deprecated fields used in selection sets',
        labelNames: ['operationType', 'operationName', 'fieldName', 'typeName'] as const,
        registers: [registry],
      }),
      fillLabelsFn: params => ({
        operationName: params.operationName!,
        operationType: params.operationType!,
        fieldName: params.deprecationInfo?.fieldName,
        typeName: params.deprecationInfo?.typeName,
      }),
    };
  }

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        usePrometheus({
          ...pluginOptions,
          http: httpHistogram,
          requestCount: requestCounter,
          requestTotalDuration: createHistogramForEnvelop({
            defaultName: 'graphql_mesh_request_duration',
            valueFromConfig: pluginOptions.requestTotalDuration,
            help: 'Time spent on running the GraphQL operation from parse to execute',
            registry,
          }),
          requestSummary,
          parse: createHistogramForEnvelop({
            defaultName: 'graphql_mesh_parse_duration',
            valueFromConfig: pluginOptions.parse,
            help: 'Time spent on parsing the GraphQL operation',
            registry,
          }),
          validate: createHistogramForEnvelop({
            defaultName: 'graphql_mesh_validate_duration',
            valueFromConfig: pluginOptions.validate,
            help: 'Time spent on validating the GraphQL operation',
            registry,
          }),
          contextBuilding: createHistogramForEnvelop({
            defaultName: 'graphql_mesh_context_building_duration',
            valueFromConfig: pluginOptions.contextBuilding,
            help: 'Time spent on building the GraphQL context',
            registry,
          }),
          execute: createHistogramForEnvelop({
            defaultName: 'graphql_mesh_execute_duration',
            valueFromConfig: pluginOptions.execute,
            help: 'Time spent on executing the GraphQL operation',
            registry,
          }),
          errors: errorsCounter,
          deprecatedFields: deprecatedCounter,
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
              args: JSON.stringify(args),
              key: JSON.stringify(key),
            },
            duration,
          );
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

          let labels: Partial<Record<string, string | number>> = {
            url,
            method: options.method,
            statusCode: response.status,
            statusText: response.statusText,
          };

          if (pluginOptions.fetchRequestHeaders) {
            labels = {
              ...labels,
              requestHeaders: JSON.stringify(options.headers),
            };
          }
          if (pluginOptions.fetchResponseHeaders) {
            labels = {
              ...labels,
              responseHeaders: JSON.stringify(response.headers),
            };
          }

          fetchHistogram.observe(labels, duration);
        };
      }
      return undefined;
    },
  };
}
