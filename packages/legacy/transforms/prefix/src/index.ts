import type { MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import BarePrefix from './barePrefix.js';
import WrapPrefix from './wrapPrefix.js';

interface PrefixTransformConstructor {
  new (options: MeshTransformOptions<YamlConfig.Transform['prefix']>): BarePrefix | WrapPrefix;
}

export default (function PrefixTransform(
  options: MeshTransformOptions<YamlConfig.Transform['prefix']>,
) {
  return options.config.mode === 'bare' ? new BarePrefix(options) : new WrapPrefix(options);
} as unknown as PrefixTransformConstructor);
