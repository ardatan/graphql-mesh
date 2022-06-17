import { GraphQLSchema, defaultFieldResolver, GraphQLFieldConfig } from 'graphql';
import { MeshTransform, YamlConfig } from '@graphql-mesh/types';
import { renameType, MapperKind, mapSchema } from '@graphql-tools/utils';

type RenameMapObject = Map<string | RegExp, string>;

// Resolver composer mapping renamed field and arguments
const defaultResolverComposer =
  (resolveFn = defaultFieldResolver, originalFieldName: string, argsMap: { [key: string]: string }) =>
  (root: any, args: any, context: any, info: any) =>
    resolveFn(
      root,
      // map renamed arguments to their original value
      argsMap
        ? Object.keys(args).reduce((acc, key: string) => ({ ...acc, [argsMap[key] || key]: args[key] }), {})
        : args,
      context,
      // map renamed field name to its original value
      originalFieldName ? { ...info, fieldName: originalFieldName } : info
    );

export default class BareRename implements MeshTransform {
  noWrap = true;
  typesMap: RenameMapObject;
  fieldsMap: Map<string, RenameMapObject>;
  argsMap: Map<string, RenameMapObject>;

  constructor({ config }: { config: YamlConfig.RenameTransform }) {
    this.typesMap = new Map();
    this.fieldsMap = new Map();
    this.argsMap = new Map();

    for (const rename of config.renames) {
      const {
        from: { type: fromTypeName, field: fromFieldName, argument: fromArgName },
        to: { type: toTypeName, field: toFieldName, argument: toArgName },
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
      if (
        fromTypeName &&
        fromFieldName &&
        fromArgName &&
        toTypeName &&
        toFieldName &&
        toArgName &&
        fromArgName !== toArgName
      ) {
        const fromName = useRegExpForFields ? new RegExp(fromArgName, regExpFlags) : fromArgName;
        const key = `${fromTypeName}.${fromFieldName}`;
        const typeMap = this.argsMap.get(key) || new Map();
        this.argsMap.set(key, typeMap.set(fromName, toArgName));
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
      ...((this.fieldsMap.size || this.argsMap.size) && {
        [MapperKind.COMPOSITE_FIELD]: (
          fieldConfig: GraphQLFieldConfig<any, any>,
          fieldName: string,
          typeName: string
        ) => {
          const typeRules = this.fieldsMap.get(typeName);
          const fieldRules = this.argsMap.get(`${typeName}.${fieldName}`);
          const newFieldName = typeRules && this.matchInMap(typeRules, fieldName);
          const argsMap =
            fieldRules &&
            Array.from(fieldRules.entries()).reduce((acc, [orName, newName]) => ({ ...acc, [newName]: orName }), {});
          if (!newFieldName && !fieldRules) return undefined;

          // Rename rules for type might have been emptied by matchInMap, in which case we can cleanup
          if (!typeRules?.size) this.fieldsMap.delete(typeName);

          if (fieldRules && fieldConfig.args) {
            fieldConfig.args = Object.entries(fieldConfig.args).reduce(
              (args, [argName, argConfig]) => ({
                ...args,
                [this.matchInMap(fieldRules, argName) || argName]: argConfig,
              }),
              {}
            );
          }

          // Wrap resolve fn to handle mapping renamed field name and/or renamed arguments
          fieldConfig.resolve = defaultResolverComposer(fieldConfig.resolve, fieldName, argsMap);

          return [newFieldName || fieldName, fieldConfig];
        },
      }),
    });
  }
}
