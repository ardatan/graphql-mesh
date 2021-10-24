import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { appendObjectFields, pruneSchema, removeObjectFields } from '@graphql-tools/utils';
import { GraphQLSchema } from 'graphql';

export default class TransferFieldTransform implements MeshTransform {
  noWrap = true;

  private config: YamlConfig.TransferFieldTransformConfig;

  constructor(options: MeshTransformOptions<YamlConfig.TransferFieldTransformConfig>) {
    const { config } = options;
    this.config = config;
  }

  transformSchema(schema: GraphQLSchema) {
    const { defaults = {} } = this.config;
    let transformedSchema: GraphQLSchema = schema;
    for (const fieldConfig of this.config.fields) {
      const {
        from: { type: fromTypeName, field: fromFieldName },
        to: { type: toTypeName, field: toFieldName },
        useRegExp = defaults.useRegExp || false,
        regExpFlags = defaults.regExpFlags || undefined,
        action = defaults.action || 'move',
      } = fieldConfig;

      const [schemaWithoutFields, sourceFieldConfigMap] = removeObjectFields(
        transformedSchema,
        fromTypeName,
        fieldName => {
          return useRegExp ? new RegExp(fromFieldName, regExpFlags).test(fieldName) : fieldName === fromFieldName;
        }
      );

      if (action === 'move') {
        transformedSchema = schemaWithoutFields;
      }

      const sourceFieldName: string = (Object.keys(sourceFieldConfigMap) as string[]).find((fieldName: string) =>
        useRegExp ? new RegExp(fromFieldName, regExpFlags).test(fieldName) : fieldName === fromFieldName
      );

      const targetFieldName = useRegExp
        ? sourceFieldName.replace(new RegExp(fromFieldName, regExpFlags), toFieldName)
        : toFieldName;

      const sourceField = sourceFieldConfigMap[sourceFieldName];

      transformedSchema = appendObjectFields(transformedSchema, toTypeName, {
        [targetFieldName]: sourceField,
      });
    }

    return pruneSchema(transformedSchema);
  }
}
