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
      if (fromTypeName && !fromFieldName && toTypeName && !toFieldName && fromTypeName !== toTypeName) {
        this.typesMap.set(useRegExpForTypes ? new RegExp(fromTypeName) : fromTypeName, toTypeName);
      }
      if (fromTypeName && fromFieldName && toTypeName && toFieldName && fromFieldName !== toFieldName) {
        const fromName = useRegExpForFields ? new RegExp(fromFieldName) : fromFieldName;
        this.fieldsMap.set(
          fromTypeName,
          this.fieldsMap.has(fromTypeName)
            ? this.fieldsMap.get(fromTypeName).set(fromName, toFieldName)
            : new Map().set(fromName, toFieldName)
        );
      }
    }
  }

  matchInMap(map: RenameMapObject, toMatch: string) {
    const mapKeyIsString = map.has(toMatch);
    const mapKey = mapKeyIsString ? toMatch : [...map.keys()].find(key => typeof key !== 'string' && key.test(toMatch));
    if (!mapKey) return null;

    const newName = mapKeyIsString ? map.get(mapKey) : toMatch.replace(mapKey, map.get(mapKey));

    // avoid iterating over strings that have already been renamed
    if (mapKeyIsString) map.delete(mapKey);

    return newName;
  }

  renameType(type: any) {
    const newTypeName = this.matchInMap(this.typesMap, type.toString());
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
        const mapType = this.fieldsMap.get(typeName);
        if (!mapType) return undefined;

        const newFieldName = this.matchInMap(mapType, fieldName);
        if (!newFieldName) return undefined;

        // remove type with emptied rules from Map
        if (!mapType.size) this.fieldsMap.delete(typeName);

        // Root fields always have a default resolver and so don't need mapping
        if (!rootFields.includes(typeName)) {
          fieldConfig.resolve = source => source[fieldName];
        }
        return [newFieldName, fieldConfig];
      },
    });
  }
}
