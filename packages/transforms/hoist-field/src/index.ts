import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import BareHoistField from './bareHoistField';
import WrapHoistField from './wrapHoistField';

export default function HoistFieldTransform(
  options: MeshTransformOptions<YamlConfig.HoistFieldTransformConfig>
): MeshTransform {
  return options.config.mode === 'bare' ? new BareHoistField(options) : new WrapHoistField(options);
}
