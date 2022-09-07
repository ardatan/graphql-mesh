import { MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';

import WrapNamingConvention from './wrapNamingConvention';
import BareNamingConvention from './bareNamingConvention';

interface NamingConventionTransformConstructor {
  new (options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>): WrapNamingConvention | BareNamingConvention;
}

export default (function NamingConventionTransform(options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>) {
  return options.config.mode === 'bare' ? new BareNamingConvention(options) : new WrapNamingConvention(options);
} as unknown as NamingConventionTransformConstructor);
