import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';

export default class WrapTransferField implements MeshTransform {
  noWrap = false;

  constructor(options: MeshTransformOptions<YamlConfig.TransferFieldTransformConfig>) {
    throw new Error('Not implemented');
  }
}
