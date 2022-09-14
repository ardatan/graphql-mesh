/* eslint-disable no-new-func */
import { MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { process } from '@graphql-mesh/cross-helpers';
import { useOperationFieldPermissions } from '@envelop/operation-field-permissions';

export default function useMeshOperationFieldPermissions(
  options: MeshPluginOptions<YamlConfig.OperationFieldPermissionsConfig>
): MeshPlugin<any> {
  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useOperationFieldPermissions({
          getPermissions(context) {
            const allowedFields = new Set<string>();
            for (const { if: condition, allow } of options.permissions) {
              const ifFn = new Function('context', 'env', 'return ' + condition);
              if (ifFn(context, process.env)) {
                for (const allowedField of allow) {
                  allowedFields.add(allowedField);
                }
              }
            }
            return allowedFields;
          },
        })
      );
    },
  };
}
