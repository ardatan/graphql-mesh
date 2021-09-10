import { YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import WrapPrefix from './wrapPrefix';
import BarePrefix from './barePrefix';

interface PrefixTransformConstructor {
  new (options: MeshTransformOptions<YamlConfig.Transform['prefix']>): BarePrefix | WrapPrefix;
}

export default (function PrefixTransform(options: MeshTransformOptions<YamlConfig.Transform['prefix']>) {
  return options.config.mode === 'bare' ? new BarePrefix(options) : new WrapPrefix(options);
} as unknown as PrefixTransformConstructor);
