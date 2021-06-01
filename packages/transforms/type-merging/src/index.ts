import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { GraphQLSchema } from 'graphql';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { loadFromModuleExportExpression, stringInterpolator } from '@graphql-mesh/utils';
import _ from 'lodash';

export default class TypeMerging implements MeshTransform {
  private baseDir: string;
  private config: YamlConfig.Transform['typeMerging'];
  constructor({ baseDir, config }: MeshTransformOptions<YamlConfig.Transform['typeMerging']>) {
    this.baseDir = baseDir;
    this.config = config;
  }

  public transformSchema(schema: GraphQLSchema, subschemaConfig: SubschemaConfig) {
    subschemaConfig.merge = subschemaConfig.merge || {};
    const mergedTypeConfigMap = subschemaConfig.merge;
    for (const mergedTypeConfigRaw of this.config || []) {
      mergedTypeConfigMap[mergedTypeConfigRaw.typeName] = {
        fieldName: mergedTypeConfigRaw.fieldName,
        args:
          mergedTypeConfigRaw.args &&
          ((root: any) => {
            if (typeof mergedTypeConfigRaw.args === 'string') {
              return stringInterpolator.parse(mergedTypeConfigRaw.args, { root });
            }
            const returnObj: any = {};
            for (const argName in mergedTypeConfigRaw.args) {
              _.set(returnObj, argName, stringInterpolator.parse(mergedTypeConfigRaw.args[argName], { root }));
            }
            return returnObj;
          }),
        argsFromKeys:
          mergedTypeConfigRaw.argsFromKeys &&
          ((keys: any) => {
            if (typeof mergedTypeConfigRaw.argsFromKeys === 'string') {
              return stringInterpolator.parse(mergedTypeConfigRaw.argsFromKeys, { keys });
            }
            const returnObj: any = {};
            for (const argName in mergedTypeConfigRaw.argsFromKeys) {
              _.set(returnObj, argName, stringInterpolator.parse(mergedTypeConfigRaw.argsFromKeys[argName], { keys }));
            }
            return returnObj;
          }),
        selectionSet: mergedTypeConfigRaw.selectionSet,
        fields: mergedTypeConfigRaw.fields?.reduce(
          (prev, curr) => ({
            ...prev,
            [curr.fieldName]: curr,
          }),
          {} as Record<string, YamlConfig.MergedFieldConfig>
        ),
        key:
          mergedTypeConfigRaw.key &&
          ((root: any) => {
            if (typeof mergedTypeConfigRaw.key === 'string') {
              return stringInterpolator.parse(mergedTypeConfigRaw.key, { root });
            }
            const returnObj: any = {};
            for (const argName in mergedTypeConfigRaw.args) {
              _.set(returnObj, argName, stringInterpolator.parse(mergedTypeConfigRaw.key[argName], { root }));
            }
            return returnObj;
          }),
        canonical: mergedTypeConfigRaw.canonical,
        resolve:
          mergedTypeConfigRaw.resolve &&
          (async (root: any, args: any, context: any, info: any) => {
            if (typeof mergedTypeConfigRaw.resolve === 'string') {
              const exported = await loadFromModuleExportExpression<any>(mergedTypeConfigRaw.resolve, {
                cwd: this.baseDir,
              });
              return exported.default || exported;
            } else if (typeof mergedTypeConfigRaw.resolve === 'object' && 'sourceArgs' in mergedTypeConfigRaw.resolve) {
              const resolverData = { root, args, context, info };
              const methodArgs: any = {};
              for (const argPath in mergedTypeConfigRaw.resolve.sourceArgs) {
                _.set(
                  methodArgs,
                  argPath,
                  stringInterpolator.parse(mergedTypeConfigRaw.resolve.sourceArgs[argPath], resolverData)
                );
              }
              const result = await context[mergedTypeConfigRaw.resolve.sourceName][
                mergedTypeConfigRaw.resolve.sourceTypeName
              ][mergedTypeConfigRaw.resolve.sourceFieldName]({
                root,
                args: methodArgs,
                context,
                info,
                selectionSet: mergedTypeConfigRaw.resolve.sourceSelectionSet,
              });
              return mergedTypeConfigRaw.resolve.returnData
                ? _.get(result, mergedTypeConfigRaw.resolve.returnData)
                : result;
            }
          }),
      };
    }
    return schema;
  }
}
