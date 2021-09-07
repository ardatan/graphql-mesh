import { YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import WrapReplaceField from './wrapReplaceField';
import BareReplaceField from './bareReplaceField';

interface ReplaceFieldTransformConstructor {
  new (options: MeshTransformOptions<YamlConfig.Transform['replaceField']>): BareReplaceField | WrapReplaceField;
}

export default (function ReplaceFieldTransform(options: MeshTransformOptions<YamlConfig.Transform['replaceField']>) {
  return options.config.mode === 'bare' ? new BareReplaceField(options) : new WrapReplaceField(options);
} as unknown as ReplaceFieldTransformConstructor);
