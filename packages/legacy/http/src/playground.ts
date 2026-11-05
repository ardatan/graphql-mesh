import { process } from '@graphql-mesh/cross-helpers';
import type { YamlConfig } from '@graphql-mesh/types';

export function resolvePlaygroundConfig(
  playground: YamlConfig.ServeConfig['playground'],
  defaultEnabled = process.env.NODE_ENV !== 'production',
): { enabled: boolean; offline: boolean } {
  if (typeof playground === 'boolean') {
    return { enabled: playground, offline: false };
  }
  if (playground != null && typeof playground === 'object') {
    return { enabled: true, offline: playground.offline === true };
  }
  return { enabled: defaultEnabled, offline: false };
}
