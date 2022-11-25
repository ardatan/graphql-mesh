import { createHive, HivePluginOptions, useHive } from '@graphql-hive/client';
import { MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';

export default function useMeshHive(pluginOptions: MeshPluginOptions<YamlConfig.HivePlugin>): MeshPlugin<{}> {
  const token = stringInterpolator.parse(pluginOptions.token, {
    env: process.env,
  });
  if (!token) {
    return {};
  }

  let usage: HivePluginOptions['usage'];
  if (pluginOptions.usage) {
    usage = {
      max: pluginOptions.usage.max,
      ttl: pluginOptions.usage.ttl,
      exclude: pluginOptions.usage.exclude,
      sampleRate: pluginOptions.usage.sampleRate,
      processVariables: pluginOptions.usage.processVariables,
    };
    if (pluginOptions.usage?.clientInfo) {
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
  let agent: HivePluginOptions['agent'];
  if (pluginOptions.agent) {
    agent = {
      timeout: pluginOptions.agent.timeout,
      maxRetries: pluginOptions.agent.maxRetries,
      minTimeout: pluginOptions.agent.minTimeout,
      sendInterval: pluginOptions.agent.sendInterval,
      maxSize: pluginOptions.agent.maxSize,
      logger: pluginOptions.logger,
    };
  }
  const hiveClient = createHive({
    enabled: true,
    debug: !!process.env.DEBUG,
    token,
    agent,
    usage,
    reporting,
  });
  const id = pluginOptions.pubsub.subscribe('destroy', () => {
    hiveClient
      .dispose()
      .catch(e => pluginOptions.logger.error(`Hive client failed to dispose`, e))
      .finally(() => pluginOptions.pubsub.unsubscribe(id));
  });
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(useHive(hiveClient));
    },
  };
}
