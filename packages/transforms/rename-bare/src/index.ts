import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';
import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { renameType, MapperKind, mapSchema } from '@graphql-tools/utils';

export default class RenameBareTransform implements MeshTransform {
  noWrap = true;
  typesMap: Map<string, string>;
  fieldsMap: Map<string, string>;

  constructor(options: MeshTransformOptions<YamlConfig.RenameBareTransformObject[]>) {
    const { config } = options;
    this.typesMap = new Map();
    this.fieldsMap = new Map();

    for (const rename of config) {
      const {
        from: { type: fromTypeName, field: fromFieldName },
        to: { type: toTypeName, field: toFieldName },
      } = rename;
      if (fromTypeName && !fromFieldName && toTypeName && !toFieldName && fromTypeName !== toTypeName) {
        this.typesMap.set(fromTypeName, toTypeName);
      }
      if (fromTypeName && fromFieldName && toTypeName && toFieldName && fromFieldName !== toFieldName) {
        this.fieldsMap.set(`${fromTypeName}_${fromFieldName}`, toFieldName);
      }
    }
  }

  renameType(type) {
    const newTypeName = this.typesMap.get(type.toString());

    if (newTypeName) {
      return renameType(type, newTypeName);
    }
  }

  transformSchema(schema: GraphQLSchema) {
    return mapSchema(schema, {
      [MapperKind.TYPE]: type => this.renameType(type),
      [MapperKind.ROOT_OBJECT]: type => this.renameType(type),
      [MapperKind.COMPOSITE_FIELD]: (
        fieldConfig: GraphQLFieldConfig<any, any>,
        fieldName: string,
        typeName: string
      ) => {
        const newFieldName = this.fieldsMap.get(`${typeName}_${fieldName}`);

        if (newFieldName) {
          return [newFieldName, fieldConfig];
        }
      },
    });
  }
}
