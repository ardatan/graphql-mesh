import type { GraphQLAbstractType, GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { defaultFieldResolver } from 'graphql';
import type { MeshTransform, YamlConfig } from '@graphql-mesh/types';
import { MapperKind, mapSchema, renameType } from '@graphql-tools/utils';
import { ignoreList } from './shared.js';

type RenameMapObject = Map<string | RegExp, string>;

// Resolver composer mapping renamed field and arguments
const defaultResolverComposer =
  (
    resolveFn = defaultFieldResolver,
    originalFieldName: string,
    argsMap: { [key: string]: string },
  ) =>
  (root: any, args: any, context: any, info: any) =>
    resolveFn(
      root,
      // map renamed arguments to their original value
      argsMap
        ? Object.keys(args).reduce(
            (acc, key) => ({ ...acc, [argsMap[String(key)] || String(key)]: args[key] }),
            {} as Record<string, any>,
          )
        : args,
      context,
      // map renamed field name to its original value
      originalFieldName ? { ...info, fieldName: originalFieldName } : info,
    );

// Helper class to identity argument renames using regular expressions to resolve types and fields
class ArgsMap {
  size: number = 0;
  entries: {
    fromType: string | RegExp;
    fromField: string | RegExp;
    fromArg: string | RegExp;
    toArg: string;
  }[] = [];

  set(
    fromType: string | RegExp,
    fromField: string | RegExp,
    fromArg: string | RegExp,
    toArg: string,
  ) {
    this.entries.push({
      fromType,
      fromField,
      fromArg,
      toArg,
    });
    this.size = this.entries.length;
  }

  get(fromType: string, fromField: string): RenameMapObject {
    const entriesForMatchingTypesAndFields = this.entries
      .filter(x =>
        typeof x.fromType === 'string' ? fromType === x.fromType : x.fromType.test(fromType),
      )
      .filter(x =>
        typeof x.fromField === 'string' ? fromField === x.fromField : x.fromField.test(fromField),
      );

    const map = new Map<string | RegExp, string>();
    for (const entry of entriesForMatchingTypesAndFields) {
      map.set(entry.fromArg, entry.toArg);
    }
    return map;
  }
}

export default class BareRename implements MeshTransform {
  noWrap = true;
  typesMap: RenameMapObject;
  typesThatCanRenameDefaults: (string | RegExp)[];
  fieldsMap: Map<string, RenameMapObject>;
  argsMap: ArgsMap;

  constructor({ config }: { config: YamlConfig.RenameTransform }) {
    this.typesMap = new Map();
    this.fieldsMap = new Map();
    this.argsMap = new ArgsMap();
    this.typesThatCanRenameDefaults = [];

    for (const rename of config.renames) {
      const {
        from: { type: fromTypeName, field: fromFieldName, argument: fromArgName },
        to: { type: toTypeName, field: toFieldName, argument: toArgName },
        useRegExpForTypes,
        useRegExpForFields,
        useRegExpForArguments,
        includeDefaults,
      } = rename;

      const regExpFlags = rename.regExpFlags || undefined;

      if (fromTypeName && toTypeName && fromTypeName !== toTypeName) {
        const typeKey = useRegExpForTypes ? new RegExp(fromTypeName, regExpFlags) : fromTypeName;
        this.typesMap.set(typeKey, toTypeName);
        if (includeDefaults) this.typesThatCanRenameDefaults.push(typeKey);
      }
      if (
        fromTypeName &&
        fromFieldName &&
        toTypeName &&
        toFieldName &&
        fromFieldName !== toFieldName
      ) {
        const fromName = useRegExpForFields
          ? new RegExp(fromFieldName, regExpFlags)
          : fromFieldName;
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
        const fromName = useRegExpForArguments ? new RegExp(fromArgName, regExpFlags) : fromArgName;
        this.argsMap.set(
          useRegExpForTypes ? new RegExp(fromTypeName) : fromTypeName,
          useRegExpForFields ? new RegExp(fromFieldName) : fromFieldName,
          fromName,
          toArgName,
        );
      }
    }
  }

  matchInMap(map: RenameMapObject, toMatch: string): string {
    const mapKeyIsString = map.has(toMatch);
    const mapKeys = mapKeyIsString
      ? [toMatch]
      : [...map.keys()].filter(key => typeof key !== 'string' && key.test(toMatch));
    if (!mapKeys?.length) return null;

    return mapKeys.reduce<string>((newName: string, mapKey: string | RegExp) => {
      if (mapKeyIsString) {
        const str = map.get(mapKey);
        // avoid re-iterating over strings that have already been renamed
        map.delete(mapKey);
        return str;
      }

      return newName.replace(mapKey, map.get(mapKey));
    }, toMatch);
  }

  renameType(type: any) {
    const typeName = type.toString();
    const typeCanRenameDefaults = this.typesThatCanRenameDefaults.some(x =>
      typeof x === 'string' ? x === typeName : x.test(typeName),
    );
    const newTypeName =
      !typeCanRenameDefaults && ignoreList.includes(typeName)
        ? null
        : this.matchInMap(this.typesMap, typeName);
    return newTypeName ? renameType(type, newTypeName) : undefined;
  }

  transformSchema(schema: GraphQLSchema) {
    return mapSchema(schema, {
      ...(this.typesMap.size && {
        [MapperKind.TYPE]: type => this.renameType(type),
        [MapperKind.ABSTRACT_TYPE]: type => {
          const currentName = type.toString();
          const newName = ignoreList.includes(currentName)
            ? null
            : this.matchInMap(this.typesMap, currentName);
          const existingResolver = type.resolveType;

          type.resolveType = async (data, context, info, abstractType) => {
            const originalResolvedTypename = await existingResolver(
              data,
              context,
              info,
              abstractType,
            );
            const newTypename = ignoreList.includes(originalResolvedTypename)
              ? null
              : this.matchInMap(this.typesMap, originalResolvedTypename);

            return newTypename || originalResolvedTypename;
          };

          if (newName && newName !== currentName) {
            return renameType(type, newName) as GraphQLAbstractType;
          }

          return undefined;
        },
        [MapperKind.ROOT_OBJECT]: type => this.renameType(type),
      }),
      ...((this.fieldsMap.size || this.argsMap.size) && {
        [MapperKind.COMPOSITE_FIELD]: (
          fieldConfig: GraphQLFieldConfig<any, any>,
          fieldName: string,
          typeName: string,
        ) => {
          const typeRules = this.fieldsMap.get(typeName);
          const fieldRules = this.argsMap.get(typeName, fieldName);
          const newFieldName = typeRules && this.matchInMap(typeRules, fieldName);
          if (!newFieldName && !fieldRules) return undefined;

          // Rename rules for type might have been emptied by matchInMap, in which case we can cleanup
          if (!typeRules?.size) this.fieldsMap.delete(typeName);

          const argsMap: { [key: string]: string } = {};
          if (fieldRules && fieldConfig.args) {
            fieldConfig.args = Object.entries(fieldConfig.args).reduce(
              (args, [argName, argConfig]) => {
                const newArgName = this.matchInMap(fieldRules, argName) || argName;
                argsMap[newArgName] = argName; // store name mappings
                return { ...args, [newArgName]: argConfig };
              },
              {},
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
