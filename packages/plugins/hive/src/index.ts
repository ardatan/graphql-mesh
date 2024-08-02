import type { HivePluginOptions } from '@graphql-hive/core';
import { createHive, useHive } from '@graphql-hive/yoga';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { Logger, MeshPlugin, MeshPubSub, YamlConfig } from '@graphql-mesh/types';
import { makeAsyncDisposable } from '@graphql-mesh/utils';

export default function useMeshHive(
  pluginOptions: YamlConfig.HivePlugin & {
    logger?: Logger;
    pubsub?: MeshPubSub;
  },
): MeshPlugin<{}> {
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
    env: process.env,
  });
  if (!token) {
    return {};
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
  const hiveClient = createHive({
    enabled: true,
    debug: !!process.env.DEBUG,
    token,
    agent,
    usage,
    reporting,
    selfHosting,
    // Mesh already disposes the client below on Mesh's `destroy` event
    autoDispose: false,
  });
  // TODO: Remove later after v0
  // Pubsub.destroy will no longer
  function onTerminate() {
    return hiveClient
      .dispose()
      .catch(e => pluginOptions.logger?.error(`Hive client failed to dispose`, e));
  }
  const id: number = pluginOptions.pubsub?.subscribe('destroy', () =>
    onTerminate().finally(() => pluginOptions.pubsub.unsubscribe(id)),
  );

  return makeAsyncDisposable<MeshPlugin<{}>>(
    // @ts-expect-error - Typings are wrong
    useHive(hiveClient),
    onTerminate,
  );
}
