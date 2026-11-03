import type { PubSub } from '@graphql-hive/pubsub';
import { createHive, useHive } from '@graphql-hive/yoga';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { MeshFetch, MeshPlugin, YamlConfig } from '@graphql-mesh/types';

type HivePluginOptions = Parameters<typeof createHive>[0];

export default function useMeshHive<TContext>(
  pluginOptions: YamlConfig.HivePlugin & {
    pubsub?: PubSub;
    fetch?: MeshFetch;
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
    return {};
  }

  const token = stringInterpolator.parse(pluginOptions.token, {
    env: globalThis.process?.env,
  });

  const persistedDocuments = pluginOptions.persistedDocuments;
  if (persistedDocuments) {
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
              env: globalThis.process?.env,
            }),
            version: stringInterpolator.parse(pluginOptions.usage.clientInfo.version, {
              context,
              env: globalThis.process?.env,
            }),
          };
        };
      }
    }
  }
  let reporting: HivePluginOptions['reporting'];
  if (pluginOptions.reporting) {
    reporting = {
      author: stringInterpolator.parse(pluginOptions.reporting.author, {
        env: globalThis.process?.env,
      }),
      commit: stringInterpolator.parse(pluginOptions.reporting.commit, {
        env: globalThis.process?.env,
      }),
      serviceName: stringInterpolator.parse(pluginOptions.reporting.serviceName, {
        env: globalThis.process?.env,
      }),
      serviceUrl: stringInterpolator.parse(pluginOptions.reporting.serviceUrl, {
        env: globalThis.process?.env,
      }),
    };
  }
  let agent: HivePluginOptions['agent'] = {
    name: 'graphql-mesh',
  };
  if (pluginOptions.agent) {
    agent = {
      name: pluginOptions.agent.name || 'graphql-mesh',
      timeout: pluginOptions.agent.timeout,
      maxRetries: pluginOptions.agent.maxRetries,
      minTimeout: pluginOptions.agent.minTimeout,
      sendInterval: pluginOptions.agent.sendInterval,
      maxSize: pluginOptions.agent.maxSize,
      logger: pluginOptions.agent.logger,
      fetch: pluginOptions.agent.fetch,
    };
  }
  let selfHosting: HivePluginOptions['selfHosting'];
  if (pluginOptions.selfHosting) {
    selfHosting = {
      graphqlEndpoint: stringInterpolator.parse(pluginOptions.selfHosting.graphqlEndpoint, {
        env: globalThis.process?.env,
      }),
      usageEndpoint: stringInterpolator.parse(pluginOptions.selfHosting.usageEndpoint, {
        env: globalThis.process?.env,
      }),
      applicationUrl: stringInterpolator.parse(pluginOptions.selfHosting.applicationUrl, {
        env: globalThis.process?.env,
      }),
    };
  }
  const yogaPluginOpts: HivePluginOptions = {
    enabled:
      // eslint-disable-next-line no-unneeded-ternary -- for brevity
      persistedDocuments && !token
        ? false // disable usage reporting if just persisted documents are configured
        : true,
    debug: ['1', 't', 'true', 'y', 'yes'].includes(globalThis.process?.env?.DEBUG),
    token,
    agent,
    usage,
    reporting,
    selfHosting,
    persistedDocuments,
  };
  // useHive already disposes the client via Yoga `onDispose` when autoDispose is enabled (default).
  // @ts-expect-error Yoga Plugin context typing does not match MeshPlugin generics
  return useHive(createHive(yogaPluginOpts));
}
