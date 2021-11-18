import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';

export default class BareHoistField implements MeshTransform {
  noWrap = true;

  constructor(options: MeshTransformOptions<YamlConfig.HoistFieldTransformConfig>) {
    throw new Error('Not implemented');
  }
}
