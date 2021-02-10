import { YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import WrapRename from './wrapRename';
import BareRename from './bareRename';

export default function RenameTransform(options: MeshTransformOptions<YamlConfig.RenameTransform>) {
  return options.config.mode === 'bare' ? new BareRename(options) : new WrapRename(options);
}
