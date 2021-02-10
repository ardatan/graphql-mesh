import { YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import RenameWrapTransform from './wrapRename';
import RenameBareTransform from './bareRename';

export default function RenameTransform(options: MeshTransformOptions<YamlConfig.RenameTransform>) {
  return options.config.mode === 'bare' ? new RenameBareTransform(options) : new RenameWrapTransform(options);
}
