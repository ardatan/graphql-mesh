import { YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import WrapRename from './wrapRename';
import BareRename from './bareRename';

export default function RenameTransform(options: MeshTransformOptions<YamlConfig.Transform['rename']>) {
  if (Array.isArray(options.config)) {
    return new WrapRename({
      ...options,
      config: {
        mode: 'wrap',
        renames: options.config,
      },
    });
  }
  return options.config.mode === 'bare' ? new BareRename(options) : new WrapRename(options);
}
