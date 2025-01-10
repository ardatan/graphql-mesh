import type { HivePluginOptions } from '@graphql-hive/core';
import { useHive } from '@graphql-hive/yoga';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { Logger, MeshPlugin, YamlConfig } from '@graphql-mesh/types';

export default function useMeshHive<TContext>(
  pluginOptions: YamlConfig.HivePlugin & {
    logger?: Logger;
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
    pluginOptions.logger?.warn('Plugin is disabled');
    return {};
  }

  const token = stringInterpolator.parse(pluginOptions.token, {
    env: process.env,
  });
  if (token) {
    pluginOptions.logger?.info('Reporting enabled');
  }

  const persistedDocuments = pluginOptions.experimental__persistedDocuments;
  if (persistedDocuments) {
    pluginOptions.logger?.info('Persisted documents enabled');
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
    logger: pluginOptions.logger,
  };
  if (pluginOptions.agent) {
    agent = {
      name: pluginOptions.agent.name || 'graphql-mesh',
      timeout: pluginOptions.agent.timeout,
      maxRetries: pluginOptions.agent.maxRetries,
      minTimeout: pluginOptions.agent.minTimeout,
      sendInterval: pluginOptions.agent.sendInterval,
      maxSize: pluginOptions.agent.maxSize,
      logger: pluginOptions.agent?.logger || pluginOptions.logger,
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
    experimental__persistedDocuments: persistedDocuments,
  };
  // @ts-expect-error - Typings are incorrect
  return useHive(yogaPluginOpts);
}
