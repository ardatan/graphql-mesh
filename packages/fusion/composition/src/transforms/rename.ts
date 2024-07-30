import {
  isSpecifiedScalarType,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLInputFieldConfig,
  type GraphQLNamedType,
  type GraphQLSchema,
} from 'graphql';
import { resolvers as scalarsResolversMap } from 'graphql-scalars';
import { getRootTypes, MapperKind, mapSchema, type SchemaMapper } from '@graphql-tools/utils';
import type { SubgraphConfig, SubgraphTransform } from '../compose.js';

export const ignoreList = [
  'Int',
  'Float',
  'String',
  'Boolean',
  'ID',
  'date',
  'hostname',
  'regex',
  'json-pointer',
  'relative-json-pointer',
  'uri-reference',
  'uri-template',
  'ObjMap',
  'HttpMethod',
  ...Object.keys(scalarsResolversMap),
];

export type TypeRenamer = (opts: {
  typeName: string;
  type: GraphQLNamedType;
  subgraphConfig: SubgraphConfig;
}) => string;
export type FieldRenamer = (opts: {
  typeName: string;
  fieldName: string;
  type: GraphQLNamedType;
  field: GraphQLFieldConfig<any, any> | GraphQLInputFieldConfig;
  subgraphConfig: SubgraphConfig;
}) => string;
export type ArgumentRenamer = (opts: {
  typeName: string;
  fieldName: string;
  argName: string;
  subgraphConfig: SubgraphConfig;
}) => string;

export interface RenameTransformConfig {
  renames?: RenameTransformObject[];
  typeRenamer?: TypeRenamer;
  fieldRenamer?: FieldRenamer;
  argRenamer?: ArgumentRenamer;
}

export interface RenameTransformObject {
  from: RenameConfig;
  to: RenameConfig;
  /**
   * Use regular expression to match the type name
   * @default false
   */
  useRegExpForTypes?: boolean;
  /**
   * Use regular expression to match the field name
   * @default false
   */
  useRegExpForFields?: boolean;
  /**
   * Use regular expression to match the argument name
   * @default false
   */
  useRegExpForArguments?: boolean;
  /**
   * Flags to use in the Regular Expression
   */
  regExpFlags?: string;
  /**
   * Flag to indicate whether certain default types (built-ins, scalars and other types specified an exclusion list) should be renamed or not.
   *
   * @default false
   */
  includeDefaults?: boolean;
}

export interface RenameConfig {
  type?: string;
  field?: string;
  argument?: string;
}

// TODO: For backwards compatibility, remove in the next major
export function createRenameTransform(opts: RenameTransformConfig) {
  const typeRenamers: TypeRenamer[] = opts.typeRenamer ? [opts.typeRenamer] : [];
  const fieldRenamers: FieldRenamer[] = opts.fieldRenamer ? [opts.fieldRenamer] : [];
  const argRenamers: ArgumentRenamer[] = opts.argRenamer ? [opts.argRenamer] : [];
  if (opts.renames?.length) {
    for (const change of opts.renames) {
      const {
        from: { type: fromTypeName, field: fromFieldName, argument: fromArgumentName },
        to: { type: toTypeName, field: toFieldName, argument: toArgumentName },
        useRegExpForTypes,
        useRegExpForFields,
        useRegExpForArguments,
      } = change;
      const includeDefaults = change.includeDefaults === true;

      const regExpFlags = change.regExpFlags || undefined;

      if (fromTypeName !== toTypeName) {
        let replaceTypeNameFn: TypeRenamer;
        if (useRegExpForTypes) {
          const typeNameRegExp = new RegExp(fromTypeName, regExpFlags);
          replaceTypeNameFn = ({ typeName }) => typeName.replace(typeNameRegExp, toTypeName);
        } else {
          replaceTypeNameFn = ({ typeName }) => (typeName === fromTypeName ? toTypeName : typeName);
        }
        typeRenamers.push(({ typeName, type, subgraphConfig }) => {
          if (!includeDefaults && ignoreList.includes(typeName)) {
            return typeName;
          }
          return replaceTypeNameFn({ typeName, type, subgraphConfig });
        });
      }

      if (fromFieldName && toFieldName && fromFieldName !== toFieldName) {
        let replaceFieldNameFn: FieldRenamer;

        if (useRegExpForFields) {
          const fieldNameRegExp = new RegExp(fromFieldName, regExpFlags);
          replaceFieldNameFn = ({ typeName, fieldName }) =>
            typeName === toTypeName ? fieldName.replace(fieldNameRegExp, toFieldName) : fieldName;
        } else {
          replaceFieldNameFn = ({ typeName, fieldName }) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName;
        }
        fieldRenamers.push(replaceFieldNameFn);
      }

      if (
        fromTypeName &&
        (fromTypeName === toTypeName || useRegExpForTypes) &&
        toFieldName &&
        (fromFieldName === toFieldName || useRegExpForFields) &&
        fromArgumentName &&
        fromArgumentName !== toArgumentName
      ) {
        let replaceArgNameFn: ArgumentRenamer;

        const fieldNameMatch = (fieldName: string) =>
          fieldName ===
          (useRegExpForFields
            ? fieldName.replace(new RegExp(fromFieldName, regExpFlags), toFieldName)
            : toFieldName);

        const typeNameMatch = (typeName: string) =>
          typeName ===
          (useRegExpForTypes
            ? typeName.replace(new RegExp(fromTypeName, regExpFlags), toTypeName)
            : toTypeName);

        if (useRegExpForArguments) {
          const argNameRegExp = new RegExp(fromArgumentName, regExpFlags);
          replaceArgNameFn = ({ typeName, fieldName, argName }) =>
            typeNameMatch(typeName) && fieldNameMatch(fieldName)
              ? argName.replace(argNameRegExp, toArgumentName)
              : argName;
        } else {
          replaceArgNameFn = ({ typeName, fieldName, argName }) =>
            typeNameMatch(typeName) && fieldNameMatch(fieldName) && argName === fromArgumentName
              ? toArgumentName
              : argName;
        }

        argRenamers.push(replaceArgNameFn);
      }
    }
  }
  return function renameTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    const schemaMapper: SchemaMapper = {};
    if (typeRenamers.length) {
      schemaMapper[MapperKind.TYPE] = type => {
        let newTypeName = type.name;
        for (const renamer of typeRenamers) {
          newTypeName =
            renamer({
              typeName: newTypeName,
              type,
              subgraphConfig,
            }) || newTypeName;
        }
        if (newTypeName !== type.name) {
          return new (Object.getPrototypeOf(type).constructor)({
            ...type.toConfig(),
            name: newTypeName,
          });
        }
        return type;
      };
    }
    if (fieldRenamers.length || argRenamers.length) {
      schemaMapper[MapperKind.FIELD] = (field, fieldName, typeName, schema) => {
        let newFieldName = fieldName;
        if (fieldRenamers.length) {
          const type = schema.getType(typeName);
          for (const renamer of fieldRenamers) {
            newFieldName =
              renamer({
                typeName,
                fieldName: newFieldName,
                type,
                field,
                subgraphConfig,
              }) || newFieldName;
          }
        }
        if (argRenamers.length && 'args' in field && field.args) {
          const newArgs: GraphQLFieldConfigArgumentMap = {};
          for (const argName in field.args) {
            let newArgName = argName;
            for (const renamer of argRenamers) {
              newArgName =
                renamer({
                  typeName,
                  fieldName,
                  argName: newArgName,
                  subgraphConfig,
                }) || newArgName;
            }
            newArgs[newArgName] = field.args[argName];
          }
          return [
            newFieldName,
            {
              ...field,
              args: newArgs,
            },
          ];
        }
        return [newFieldName, field];
      };
    }
    return mapSchema(schema, schemaMapper);
  };
}

type MapperTypeKind =
  | MapperKind.ROOT_OBJECT
  | MapperKind.OBJECT_TYPE
  | MapperKind.INTERFACE_TYPE
  | MapperKind.UNION_TYPE
  | MapperKind.ENUM_TYPE
  | MapperKind.INPUT_OBJECT_TYPE
  | MapperKind.SCALAR_TYPE
  | MapperKind.TYPE;

export function createRenameTypeTransform(
  renameFn: TypeRenamer,
  kind: MapperTypeKind = MapperKind.TYPE,
): SubgraphTransform {
  return function renameTypeTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    const rootTypes: Set<GraphQLNamedType> = getRootTypes(schema);
    return mapSchema(schema, {
      [kind]: (type: GraphQLNamedType) =>
        isSpecifiedScalarType(type) || rootTypes.has(type)
          ? type
          : new (Object.getPrototypeOf(type).constructor)({
              ...type.toConfig(),
              name:
                renameFn({
                  typeName: type.name,
                  type,
                  subgraphConfig,
                }) || type.name,
            }),
    });
  };
}

export type MapperFieldKind =
  | MapperKind.FIELD
  | MapperKind.ROOT_FIELD
  | MapperKind.OBJECT_FIELD
  | MapperKind.INTERFACE_FIELD
  | MapperKind.INPUT_OBJECT_FIELD;

export function createRenameFieldTransform(
  renameFn: FieldRenamer,
  kind: MapperFieldKind = MapperKind.FIELD,
): SubgraphTransform {
  return function renameFieldTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    return mapSchema(schema, {
      [kind]: (
        field: GraphQLFieldConfig<any, any> | GraphQLInputFieldConfig,
        fieldName: string,
        typeName: string,
      ) => [
        renameFn({
          typeName,
          fieldName,
          type: schema.getType(typeName),
          field,
          subgraphConfig,
        }) || fieldName,
        field,
      ],
    });
  };
}
