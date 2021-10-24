import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import BareTransferField from './bareTransferField';
import WrapTransferField from './wrapTransferField';

export default function HoistFieldTransform(
  options: MeshTransformOptions<YamlConfig.TransferFieldTransformConfig>
): MeshTransform {
  return options.config.mode === 'bare' ? new BareTransferField(options) : new WrapTransferField(options);
}
