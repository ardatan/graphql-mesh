import useMeshHive from '@graphql-mesh/plugin-hive';
import { useApolloUsageReport } from '@graphql-yoga/plugin-apollo-usage-report';
import type { MeshServeConfig, MeshServeConfigContext, MeshServePlugin } from './types.js';

export function getRegistryPlugin<TContext>(
  config: MeshServeConfig<TContext>,
  configContext: MeshServeConfigContext,
): MeshServePlugin<TContext> {
  if (config.reporting?.type === 'hive') {
    // @ts-expect-error - Typing issue with useMeshHive
    return useMeshHive({
      ...configContext,
      logger: configContext.logger.child('Hive'),
      ...config.reporting,
    });
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
    // @ts-expect-error - Typing issue with useMeshHive
    return useApolloUsageReport(config.reporting);
  }
  return {};
}
