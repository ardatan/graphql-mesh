import { createHive, useHive } from '@graphql-hive/yoga';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { MeshFetch, MeshPlugin, YamlConfig } from '@graphql-mesh/types';
import { Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';

type HivePluginOptions = Parameters<typeof createHive>[0];

export default function useMeshHive<TContext>(
  pluginOptions: YamlConfig.HivePlugin & {
    log?: Logger;
    pubsub?: PubSub;
    fetch?: MeshFetch;
    disposables?: AsyncDisposableStack;
  },
): MeshPlugin<TContext> {
  const enabled =
    pluginOptions != null && 'enabled' in pluginOptions
      ? typeof pluginOptions.enabled === 'string'
        ? // eslint-disable-next-line no-new-func
          new Function(`return ${pluginOptions.enabled}`)()
        : pluginOptions.enabled
      : true;

  if (!enabled) {
    pluginOptions.log?.warn('Plugin is disabled');
    return {};
  }

  const token = stringInterpolator.parse(pluginOptions.token, {
    env: process.env,
  });
  if (token) {
    pluginOptions.log?.info('Reporting enabled');
  }

  const persistedDocuments = pluginOptions.persistedDocuments;
  if (persistedDocuments) {
    pluginOptions.log?.info('Persisted documents enabled');
    persistedDocuments.fetch ||= pluginOptions.fetch;
  }

  let usage: HivePluginOptions['usage'] = true;
  if (pluginOptions.usage) {
    usage = {
      max: pluginOptions.usage.max,
      ttl: pluginOptions.usage.ttl,
      exclude: pluginOptions.usage.exclude,
      sampleRate: pluginOptions.usage.sampleRate,
      processVariables: pluginOptions.usage.processVariables,
    };
    if (pluginOptions.usage?.clientInfo) {
      if (typeof pluginOptions.usage.clientInfo === 'function') {
        usage.clientInfo = pluginOptions.usage.clientInfo;
      } else {
        usage.clientInfo = function (context) {
          return {
            name: stringInterpolator.parse(pluginOptions.usage.clientInfo.name, {
              context,
              env: process.env,
            }),
            version: stringInterpolator.parse(pluginOptions.usage.clientInfo.version, {
              context,
              env: process.env,
            }),
          };
        };
      }
    }
  }
  let reporting: HivePluginOptions['reporting'];
  if (pluginOptions.reporting) {
    reporting = {
      author: stringInterpolator.parse(pluginOptions.reporting.author, { env: process.env }),
      commit: stringInterpolator.parse(pluginOptions.reporting.commit, { env: process.env }),
      serviceName: stringInterpolator.parse(pluginOptions.reporting.serviceName, {
        env: process.env,
      }),
      serviceUrl: stringInterpolator.parse(pluginOptions.reporting.serviceUrl, {
        env: process.env,
      }),
    };
  }
  let agent: HivePluginOptions['agent'] = {
    name: 'graphql-mesh',
    logger: pluginOptions.log,
  };
  if (pluginOptions.agent) {
    agent = {
      name: pluginOptions.agent.name || 'graphql-mesh',
      timeout: pluginOptions.agent.timeout,
      maxRetries: pluginOptions.agent.maxRetries,
      minTimeout: pluginOptions.agent.minTimeout,
      sendInterval: pluginOptions.agent.sendInterval,
      maxSize: pluginOptions.agent.maxSize,
      logger: pluginOptions.agent?.logger || pluginOptions.log,
      fetch: pluginOptions.agent?.fetch,
    };
  }
  let selfHosting: HivePluginOptions['selfHosting'];
  if (pluginOptions.selfHosting) {
    selfHosting = {
      graphqlEndpoint: stringInterpolator.parse(pluginOptions.selfHosting.graphqlEndpoint, {
        env: process.env,
      }),
      usageEndpoint: stringInterpolator.parse(pluginOptions.selfHosting.usageEndpoint, {
        env: process.env,
      }),
      applicationUrl: stringInterpolator.parse(pluginOptions.selfHosting.applicationUrl, {
        env: process.env,
      }),
    };
  }
  const yogaPluginOpts: HivePluginOptions = {
    enabled:
      // eslint-disable-next-line no-unneeded-ternary -- for brevity
      persistedDocuments && !token
        ? false // disable usage reporting if just persisted documents are configured
        : true,
    debug: ['1', 't', 'true', 'y', 'yes'].includes(process.env.DEBUG),
    token,
    agent,
    usage,
    reporting,
    selfHosting,
    persistedDocuments,
    logger: pluginOptions.log,
  };
  const client = createHive(yogaPluginOpts);
  const hivePlugin = useHive(client);
  pluginOptions.disposables?.defer(() =>
    client.dispose().catch(e => pluginOptions.log?.error('Error disposing Hive client', e)),
  );
  // @ts-expect-error - Typings are incorrect
  return hivePlugin;
}
