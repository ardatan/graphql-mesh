import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { renameFieldNode, wrapFieldNode, unwrapValue } from '@graphql-tools/wrap/transforms/HoistField';

export default class WrapTransferField implements MeshTransform {
  noWrap = false;

  constructor(options: MeshTransformOptions<YamlConfig.TransferFieldTransformConfig>) {
    throw new Error('Not implemented');
  }
}
