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
  DirectiveLocation,
  getNamedType,
  GraphQLDirective,
  GraphQLSchema,
  GraphQLString,
  isEnumType,
  isSpecifiedScalarType,
  type GraphQLFieldConfigArgumentMap,
} from 'graphql';
import { resolvers } from 'graphql-scalars';
import {
  getDirectiveExtensions,
  MapperKind,
  mapSchema,
  type SchemaMapper,
} from '@graphql-tools/utils';
import type { SubgraphTransform } from '../compose.js';
import { bakeConnectEnumsInTransform } from './connect-enum-bake.js';
import { rewriteConnectArgReferences, withOriginalKeyFallback } from './utils.js';

const EnumValueDirective = new GraphQLDirective({
  name: 'enum',
  locations: [DirectiveLocation.ENUM_VALUE],
  args: {
    subgraph: { type: GraphQLString },
    value: { type: GraphQLString },
  },
  isRepeatable: true,
});

function isFromGraphQLScalars(name: string) {
  return Object.keys(resolvers).includes(name);
}

/** Federation Connectors directive input types — field names (GET/POST/baseURL) are spec-fixed. */
const CONNECTORS_INPUT_TYPES = new Set([
  'ConnectHTTP',
  'SourceHTTP',
  'HTTPHeaderMapping',
  'ConnectorErrors',
]);

function schemaUsesConnect(schema: GraphQLSchema): boolean {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!('getFields' in type)) continue;
    for (const field of Object.values((type as any).getFields())) {
      if (getDirectiveExtensions(field)?.connect?.length) return true;
    }
  }
  const schemaDirs = getDirectiveExtensions(schema);
  return Boolean(
    schemaDirs?.link?.some(
      (l: any) => typeof l?.url === 'string' && l.url.includes('specs.apollo.dev/connect'),
    ),
  );
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
      if (
        isSpecifiedScalarType(type) ||
        isFromGraphQLScalars(type.name) ||
        CONNECTORS_INPUT_TYPES.has(type.name)
      ) {
        return type;
      }
      return new (Object.getPrototypeOf(type).constructor)({
        ...type.toConfig(),
        name: typeNamesFn(type.name),
      });
    };
  }
  if (fieldNamesFn || fieldArgumentNamesFn || enumValuesFn) {
    schemaMapper[MapperKind.FIELD] = (fieldConfig, fieldName, typeName) => {
      // Keep Connectors HTTP method / baseURL field names intact.
      const newFieldName = CONNECTORS_INPUT_TYPES.has(typeName)
        ? fieldName
        : fieldNamesFn?.(fieldName) || fieldName;
      if (!fieldArgumentNamesFn && !enumValuesFn) {
        return [newFieldName, withOriginalKeyFallback(fieldConfig, fieldName, newFieldName)];
      }
      if ('args' in fieldConfig && fieldConfig.args && (fieldArgumentNamesFn || enumValuesFn)) {
        const newArgs: GraphQLFieldConfigArgumentMap = {};
        const argRenameMap = new Map<string, string>();
        for (const argName in fieldConfig.args) {
          const newArgName = fieldArgumentNamesFn?.(argName) || argName;
          if (newArgName !== argName) {
            argRenameMap.set(argName, newArgName);
          }
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
        const fieldDirectives = getDirectiveExtensions(fieldConfig);
        const rewrittenDirectives = rewriteConnectArgReferences(fieldDirectives, argRenameMap);
        if (rewrittenDirectives !== fieldDirectives) {
          const fieldExtensions: Record<string, any> = { ...(fieldConfig.extensions || {}) };
          fieldExtensions.directives = rewrittenDirectives;
          return [
            newFieldName,
            withOriginalKeyFallback(
              {
                ...fieldConfig,
                extensions: fieldExtensions,
                args: newArgs,
                astNode: undefined,
              },
              fieldName,
              newFieldName,
            ),
          ];
        }
        return [
          newFieldName,
          withOriginalKeyFallback(
            {
              ...fieldConfig,
              args: newArgs,
            },
            fieldName,
            newFieldName,
          ),
        ];
      }
      return [newFieldName, withOriginalKeyFallback(fieldConfig, fieldName, newFieldName)];
    };
  }
  if (enumValuesFn) {
    schemaMapper[MapperKind.ENUM_VALUE] = (valueConfig, _typeName, _schema, externalValue) => {
      const newExternalValue = enumValuesFn(externalValue);
      if (newExternalValue === externalValue) {
        return [newExternalValue, valueConfig];
      }
      // Keep the original JSON/wire value when the GraphQL enum name changes.
      const nextValue =
        valueConfig.value !== undefined && valueConfig.value !== externalValue
          ? valueConfig.value
          : externalValue;
      const existingDirectives = getDirectiveExtensions(valueConfig) || {};
      // Always stash wire value on `@enum` first; Connectors bake strips it into
      // `@connect` selections below. Non-connectors keep `@enum` for Mesh runtime.
      return [
        newExternalValue,
        {
          ...valueConfig,
          value: nextValue,
          extensions: {
            ...valueConfig.extensions,
            directives: {
              ...existingDirectives,
              enum: [{ value: JSON.stringify(nextValue) }],
            },
          },
          astNode: undefined,
        },
      ];
    };
  }
  return function namingConventionTransform(schema: GraphQLSchema) {
    const connectors = schemaUsesConnect(schema);
    let next = mapSchema(schema, schemaMapper);
    if (enumValuesFn && !connectors && !next.getDirective('enum')) {
      const config = next.toConfig();
      next = new GraphQLSchema({
        ...config,
        directives: [...config.directives, EnumValueDirective],
      });
    }
    // Federation Connectors: bake rename remaps into `@connect`, drop Mesh `@enum`.
    if (enumValuesFn && connectors) {
      next = bakeConnectEnumsInTransform(next);
    }
    return next;
  };
}

export * from 'change-case';
export function upperCase(str: string) {
  return str.toUpperCase();
}
export function lowerCase(str: string) {
  return str.toLowerCase();
}
