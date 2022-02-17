import { GraphQLSchema, GraphQLFieldConfig } from 'graphql';
import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { renameType, MapperKind, mapSchema } from '@graphql-tools/utils';

type RenameMapObject = Map<string | RegExp, string>;

export default class BareRename implements MeshTransform {
  noWrap = true;
  typesMap: RenameMapObject;
  fieldsMap: Map<string, RenameMapObject>;

  constructor(options: MeshTransformOptions<YamlConfig.RenameTransform>) {
    const { config } = options;
    this.typesMap = new Map();
    this.fieldsMap = new Map();

    for (const rename of config.renames) {
      const {
        from: { type: fromTypeName, field: fromFieldName },
        to: { type: toTypeName, field: toFieldName },
        useRegExpForTypes,
        useRegExpForFields,
      } = rename;

      const regExpFlags = rename.regExpFlags || undefined;

      if (fromTypeName && !fromFieldName && toTypeName && !toFieldName && fromTypeName !== toTypeName) {
        this.typesMap.set(useRegExpForTypes ? new RegExp(fromTypeName, regExpFlags) : fromTypeName, toTypeName);
      }
      if (fromTypeName && fromFieldName && toTypeName && toFieldName && fromFieldName !== toFieldName) {
        const fromName = useRegExpForFields ? new RegExp(fromFieldName, regExpFlags) : fromFieldName;
        const typeMap = this.fieldsMap.get(fromTypeName) || new Map();
        this.fieldsMap.set(fromTypeName, typeMap.set(fromName, toFieldName));
      }
    }
  }

  matchInMap(map: RenameMapObject, toMatch: string) {
    const mapKeyIsString = map.has(toMatch);
    const mapKey = mapKeyIsString ? toMatch : [...map.keys()].find(key => typeof key !== 'string' && key.test(toMatch));
    if (!mapKey) return null;

    const newName = mapKeyIsString ? map.get(mapKey) : toMatch.replace(mapKey, map.get(mapKey));

    // avoid re-iterating over strings that have already been renamed
    if (mapKeyIsString) map.delete(mapKey);

    return newName;
  }

  renameType(type: any) {
    const newTypeName = this.matchInMap(this.typesMap, type.toString());
    return newTypeName ? renameType(type, newTypeName) : undefined;
  }

  transformSchema(schema: GraphQLSchema) {
    return mapSchema(schema, {
      ...(this.typesMap.size && { [MapperKind.TYPE]: type => this.renameType(type) }),
      ...(this.typesMap.size && { [MapperKind.ROOT_OBJECT]: type => this.renameType(type) }),
      ...(this.fieldsMap.size && {
        [MapperKind.COMPOSITE_FIELD]: (
          fieldConfig: GraphQLFieldConfig<any, any>,
          fieldName: string,
          typeName: string
        ) => {
          const mapType = this.fieldsMap.get(typeName);
          const newFieldName = mapType && this.matchInMap(mapType, fieldName);
          if (!newFieldName) return undefined;

          // Rename rules for type might have been emptied by matchInMap, in which case we can cleanup
          if (!mapType.size) this.fieldsMap.delete(typeName);

          // Fields that don't have a custom resolver will need to map response to old field name
          if (!fieldConfig.resolve) fieldConfig.resolve = source => source[fieldName];

          return [newFieldName, fieldConfig];
        },
      }),
    });
  }
}
