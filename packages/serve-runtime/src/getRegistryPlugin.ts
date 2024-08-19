import useMeshHive from '@graphql-mesh/plugin-hive';
import { useApolloUsageReport } from '@graphql-yoga/plugin-apollo-usage-report';
import type { MeshServeConfig, MeshServeConfigContext, MeshServePlugin } from './types.js';

export function getRegistryPlugin<TContext>(
  config: MeshServeConfig<TContext>,
  configContext: MeshServeConfigContext,
): {
  name?: string;
  plugin: MeshServePlugin<TContext>;
} {
  if (config.reporting?.type === 'hive') {
    return {
      name: 'Hive',
      plugin: useMeshHive({
        ...configContext,
        logger: configContext.logger.child('Hive'),
        ...config.reporting,
      }),
    };
  } else if (
    config.reporting?.type === 'graphos' ||
    (!config.reporting &&
      'supergraph' in config &&
      typeof config.supergraph === 'object' &&
      'type' in config.supergraph &&
      config.supergraph.type === 'graphos')
  ) {
    if (
      'supergraph' in config &&
      typeof config.supergraph === 'object' &&
      'type' in config.supergraph &&
      config.supergraph.type === 'graphos'
    ) {
      config.reporting.apiKey ||= config.supergraph.apiKey;
      config.reporting.graphRef ||= config.supergraph.graphRef;
    }
    return {
      name: 'GraphOS',
      // @ts-expect-error - TODO: Fix types
      plugin: useApolloUsageReport(config.reporting),
    };
  }
  return {
    plugin: {},
  };
}
