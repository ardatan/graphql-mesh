import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';
import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { renameType, MapperKind, mapSchema } from '@graphql-tools/utils';

export default class BareRename implements MeshTransform {
  noWrap = true;
  typesMap: Map<string, string>;
  fieldsMap: Map<string, string>;

  constructor(options: MeshTransformOptions<YamlConfig.RenameTransform>) {
    const { config } = options;
    this.typesMap = new Map();
    this.fieldsMap = new Map();

    for (const rename of config.renames) {
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

  renameType(type: any) {
    const newTypeName = this.typesMap.get(type.toString());
    return newTypeName ? renameType(type, newTypeName) : undefined;
  }

  transformSchema(schema: GraphQLSchema) {
    const rootFields = ['Query', 'Mutation', 'Subscription'];

    return mapSchema(schema, {
      [MapperKind.TYPE]: type => this.renameType(type),
      [MapperKind.ROOT_OBJECT]: type => this.renameType(type),
      [MapperKind.COMPOSITE_FIELD]: (
        fieldConfig: GraphQLFieldConfig<any, any>,
        fieldName: string,
        typeName: string
      ) => {
        const newFieldName = this.fieldsMap.get(`${typeName}_${fieldName}`);
        if (!newFieldName) return undefined;

        // Root fields always have a default resolver and so don't need mapping
        if (!rootFields.includes(typeName)) {
          fieldConfig.resolve = source => source[fieldName];
        }
        return [newFieldName, fieldConfig];
      },
    });
  }
}
