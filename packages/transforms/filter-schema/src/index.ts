import { YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import WrapFilter from './wrapFilter';
import BareFilter from './bareFilter';

export default function FilterTransform(options: MeshTransformOptions<YamlConfig.Transform['filterSchema']>) {
  if (Array.isArray(options.config)) {
    return new WrapFilter({
      ...options,
      config: {
        mode: 'wrap',
        filters: options.config,
      },
    });
  }

  return options.config.mode === 'bare' ? new BareFilter(options) : new WrapFilter(options);
}
