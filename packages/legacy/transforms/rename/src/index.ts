import type { YamlConfig } from '@graphql-mesh/types';
import BareRename from './bareRename.js';
import WrapRename from './wrapRename.js';

interface RenameTransformConstructor {
  new (options: { config: YamlConfig.RenameTransform }): BareRename | WrapRename;
}

export default (function RenameTransform(options: { config: YamlConfig.RenameTransform }) {
  if (Array.isArray(options.config)) {
    return new WrapRename({
      config: {
        mode: 'wrap',
        renames: options.config,
      },
    });
  }
  return options.config.mode === 'bare' ? new BareRename(options) : new WrapRename(options);
} as unknown as RenameTransformConstructor);
