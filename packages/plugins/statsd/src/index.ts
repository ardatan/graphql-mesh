import type { Tags } from 'hot-shots';
import { StatsD } from 'hot-shots';
import { useStatsD } from '@envelop/statsd';
import type { MeshPlugin, YamlConfig } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

const metricNames = {
  delegationCount: 'delegations.count',
  delegationErrorCount: 'delegations.error.count',
  delegationLatency: 'delegations.latency',
  fetchCount: 'fetch.count',
  fetchErrorCount: 'fetch.error.count',
  fetchLatency: 'fetch.latency',
};

export type StatsDPluginOptions = Omit<YamlConfig.StatsdPlugin, 'client'> & {
  client?: StatsD | YamlConfig.StatsdClientConfiguration;
};

export default function useMeshStatsd(pluginOptions: YamlConfig.StatsdPlugin): MeshPlugin<any> {
  const client =
    pluginOptions.client && 'close' in pluginOptions.client
      ? (pluginOptions.client as StatsD)
      : new StatsD(pluginOptions.client);
  const prefix = pluginOptions.prefix || 'graphql';
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useStatsD({
          ...pluginOptions,
          client,
        }),
      );
    },
    onFetch({ url, options, info }) {
      const tags: Tags = {
        url,
        method: options.method,
        sourceName: (info as any)?.sourceName,
        fieldName: info?.fieldName,
        requestHeaders: JSON.stringify(options.headers),
      };
      const start = Date.now();
      return ({ response }) => {
        tags.statusCode = response.status.toString();
        tags.statusText = response.statusText;
        const responseHeadersObj = getHeadersObj(response.headers);
        tags.responseHeaders = JSON.stringify(responseHeadersObj);
        client.increment(`${prefix}.${metricNames.fetchCount}`, tags);
        const end = Date.now();
        if (!response.ok) {
          client.increment(`${prefix}.${metricNames.fetchErrorCount}`, tags);
        }
        client.histogram(`${prefix}.${metricNames.fetchLatency}`, end - start, tags);
      };
    },
    onDelegate({ sourceName, fieldName, args, key }) {
      const tags: Tags = {
        sourceName,
        fieldName,
        args: JSON.stringify(args),
        key,
      };
      const start = Date.now();
      return ({ result }) => {
        if (result instanceof Error) {
          client.increment(`${prefix}.${metricNames.delegationErrorCount}`, tags);
        }
        client.increment(`${prefix}.${metricNames.delegationCount}`, tags);
        const end = Date.now();
        client.histogram(`${prefix}.${metricNames.delegationLatency}`, end - start, tags);
      };
    },
    [DisposableSymbols.asyncDispose]() {
      return new Promise<void>((resolve, reject) => {
        client.close(err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },
  };
}
