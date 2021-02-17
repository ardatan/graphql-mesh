import { YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import WrapFilter from './wrapFilter';
import BareFilter from './bareFilter';

export default function FilterTransform(options: MeshTransformOptions<YamlConfig.FilterSchemaTransform>) {
  return options.config.mode === 'bare' ? new BareFilter(options) : new WrapFilter(options);
}
