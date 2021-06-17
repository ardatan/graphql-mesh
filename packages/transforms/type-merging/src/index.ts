import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { GraphQLSchema } from 'graphql';
import _ from 'lodash';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';

export default class TypeMerging implements MeshTransform {
  private config: YamlConfig.Transform['typeMerging'];
  constructor({ config }: MeshTransformOptions<YamlConfig.Transform['typeMerging']>) {
    this.config = config;
  }

  public transformSchema(schema: GraphQLSchema, subschemaConfig: SubschemaConfig) {
    const { stitchingDirectivesTransformer } = stitchingDirectives();
    if (this.config.types) {
      for (const mergedTypeConfig of this.config.types) {
        const type = schema.getType(mergedTypeConfig.typeName);
        type.extensions = type.extensions || {};
        const typeDirectiveExtensions = ((type.extensions.directives as any) = type.extensions.directives || {});
        if (mergedTypeConfig.key) {
          typeDirectiveExtensions.key = mergedTypeConfig.key;
        }
        if (mergedTypeConfig.canonical) {
          typeDirectiveExtensions.canonical = {};
        }
        if (mergedTypeConfig.fields) {
          if (!('getFields' in type)) {
            throw new Error('You cannot add field annotations to this type ' + mergedTypeConfig.typeName);
          }
          const fieldMap = type.getFields();
          for (const fieldConfig of mergedTypeConfig.fields) {
            const field = fieldMap[fieldConfig.fieldName];
            field.extensions = field.extensions || {};
            const fieldDirectiveExtensions = ((field.extensions.directives as any) = field.extensions.directives || {});
            if (fieldConfig.computed) {
              fieldDirectiveExtensions.computed = fieldConfig.computed;
            }
          }
        }
      }
    }
    if (this.config.queryFields) {
      const queryFieldMap = schema.getQueryType().getFields();
      for (const { queryFieldName, ...rootFieldConfig } of this.config.queryFields) {
        const field = queryFieldMap[queryFieldName];
        field.extensions = field.extensions || {};
        const fieldDirectiveExtensions = ((field.extensions.directives as any) = field.extensions.directives || {});
        fieldDirectiveExtensions.merge = rootFieldConfig;
      }
    }
    subschemaConfig.merge = stitchingDirectivesTransformer({ schema }).merge;
    return schema;
  }
}
