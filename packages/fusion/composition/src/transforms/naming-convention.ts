import {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  headerCase,
  noCase,
  paramCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
} from 'change-case';
import {
  getNamedType,
  isEnumType,
  isSpecifiedScalarType,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLSchema,
} from 'graphql';
import { resolvers } from 'graphql-scalars';
import { MapperKind, mapSchema, type SchemaMapper } from '@graphql-tools/utils';
import type { SubgraphTransform } from '../compose.js';

function isFromGraphQLScalars(name: string) {
  return Object.keys(resolvers).includes(name);
}

export type NameReplacer = (name: string) => string;

export type NamingConventionType = keyof typeof NamingConventionMap;

// TODO: For backwards compatibility; remove this in the next major
export const NamingConventionMap = {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  headerCase,
  noCase,
  paramCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
  upperCase,
  lowerCase,
} as const;

export interface NamingConventionTransform {
  // TODO: For backwards compatibility; remove this in the next major, and use `NameReplacer` only
  typeNames?: NamingConventionType | NameReplacer;
  fieldNames?: NamingConventionType | NameReplacer;
  enumValues?: NamingConventionType | NameReplacer;
  fieldArgumentNames?: NamingConventionType | NameReplacer;
}

export function createNamingConventionTransform(
  config: NamingConventionTransform,
): SubgraphTransform {
  const typeNamesFn =
    typeof config.typeNames === 'string' ? NamingConventionMap[config.typeNames] : config.typeNames;
  const fieldNamesFn =
    typeof config.fieldNames === 'string'
      ? NamingConventionMap[config.fieldNames]
      : config.fieldNames;
  const enumValuesFn =
    typeof config.enumValues === 'string'
      ? NamingConventionMap[config.enumValues]
      : config.enumValues;
  const fieldArgumentNamesFn =
    typeof config.fieldArgumentNames === 'string'
      ? NamingConventionMap[config.fieldArgumentNames]
      : config.fieldArgumentNames;

  const schemaMapper: SchemaMapper = {};
  if (typeNamesFn) {
    schemaMapper[MapperKind.TYPE] = type => {
      if (isSpecifiedScalarType(type) || isFromGraphQLScalars(type.name)) {
        return type;
      }
      return new (Object.getPrototypeOf(type).constructor)({
        ...type.toConfig(),
        name: typeNamesFn(type.name),
      });
    };
  }
  if (fieldNamesFn || fieldArgumentNamesFn || enumValuesFn) {
    schemaMapper[MapperKind.FIELD] = (fieldConfig, fieldName) => {
      const newFieldName = fieldNamesFn?.(fieldName) || fieldName;
      if (!fieldArgumentNamesFn && !enumValuesFn) {
        return [newFieldName, fieldConfig];
      }
      if ('args' in fieldConfig && fieldConfig.args && (fieldArgumentNamesFn || enumValuesFn)) {
        const newArgs: GraphQLFieldConfigArgumentMap = {};
        for (const argName in fieldConfig.args) {
          const newArgName = fieldArgumentNamesFn?.(argName) || argName;
          const argConfig = fieldConfig.args[argName];
          if (!argConfig.defaultValue || !enumValuesFn) {
            newArgs[newArgName] = argConfig;
            continue;
          }
          const namedArgType = getNamedType(argConfig.type);
          if (!isEnumType(namedArgType)) {
            newArgs[newArgName] = argConfig;
            continue;
          }
          const newDefaultValue = enumValuesFn(argConfig.defaultValue.toString());
          newArgs[newArgName] = {
            ...argConfig,
            defaultValue: newDefaultValue,
          };
        }
        return [
          newFieldName,
          {
            ...fieldConfig,
            args: newArgs,
          },
        ];
      }
      return [newFieldName, fieldConfig];
    };
  }
  if (enumValuesFn) {
    schemaMapper[MapperKind.ENUM_VALUE] = (valueConfig, _typeName, _schema, externalValue) => {
      const newExternalValue = enumValuesFn(externalValue);
      return [newExternalValue, valueConfig];
    };
  }
  return function namingConventionTransform(schema: GraphQLSchema) {
    return mapSchema(schema, schemaMapper);
  };
}

export * from 'change-case';
export function upperCase(str: string) {
  return str.toUpperCase();
}
export function lowerCase(str: string) {
  return str.toLowerCase();
}
