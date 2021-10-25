import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { appendObjectFields, pruneSchema, removeObjectFields } from '@graphql-tools/utils';
import { GraphQLFieldConfigMap, GraphQLSchema } from 'graphql';

type FieldConfig = YamlConfig.TransferFieldTransformFieldConfigObject & {
  removeObjectFieldsTestFn: (fieldName: string) => boolean;
};

export default class TransferFieldTransform implements MeshTransform {
  noWrap = true;

  private transfers: FieldConfig[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.TransferFieldTransformConfig>) {
    const { config } = options;

    const {
      defaults: {
        useRegExp: useRegExpDefault = false,
        regExpFlags: regExpFlagsDefault = undefined,
        action: actionDefault = 'move',
      } = {},
      fields: fieldConfigs,
    } = config;

    for (const fieldConfig of fieldConfigs) {
      const {
        from,
        to,
        useRegExp = useRegExpDefault,
        regExpFlags = regExpFlagsDefault,
        action = actionDefault,
      } = fieldConfig;

      const fieldConfigWithDefaults: FieldConfig = {
        from,
        to,
        useRegExp,
        regExpFlags,
        action,
        removeObjectFieldsTestFn: useRegExp
          ? fieldName => new RegExp(from.field, regExpFlags).test(fieldName)
          : fieldName => fieldName === from.field,
      };

      this.transfers.push(fieldConfigWithDefaults);
    }
  }

  transformSchema(schema: GraphQLSchema) {
    let transformedSchema = schema;

    for (const fieldConfig of this.transfers) {
      const {
        from: { type: fromTypeName, field: fromFieldName },
        to: { type: toTypeName, field: toFieldName },
        useRegExp,
        regExpFlags,
        action,
        removeObjectFieldsTestFn,
      } = fieldConfig;

      const [schemaWithoutFields, sourceFieldConfigMap] = removeObjectFields(
        transformedSchema,
        fromTypeName,
        removeObjectFieldsTestFn
      );

      if (action === 'move') {
        transformedSchema = schemaWithoutFields;
      }

      const sourceFieldNames = Object.keys(sourceFieldConfigMap) as string[];

      const appendFieldConfigMap: GraphQLFieldConfigMap<any, any> = {};
      for (const sourceFieldName of sourceFieldNames) {
        const targetFieldName = useRegExp
          ? sourceFieldName.replace(new RegExp(fromFieldName, regExpFlags), toFieldName)
          : toFieldName;

        const sourceField = sourceFieldConfigMap[sourceFieldName];
        appendFieldConfigMap[targetFieldName] = sourceField;
      }

      transformedSchema = appendObjectFields(transformedSchema, toTypeName, appendFieldConfigMap);
    }

    return pruneSchema(transformedSchema);
  }
}
