import { YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';

import WrapNamingConvention from './wrapNamingConvention.js';
import BareNamingConvention from './bareNamingConvention.js';
interface NamingConventionTransformConstructor {
  new (options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>):
    | WrapNamingConvention
    | BareNamingConvention;
}

export default (function NamingConventionTransform(
  options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>
) {
  return options.config.mode === 'bare' ? new BareNamingConvention(options) : new WrapNamingConvention(options);
} as unknown as NamingConventionTransformConstructor);
