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
import { rewriteConnectArgReferences } from './utils.js';

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

/** Apollo Connectors directive input types — field names (GET/POST/baseURL) are spec-fixed. */
const APOLLO_CONNECTORS_INPUT_TYPES = new Set([
  'ConnectHTTP',
  'SourceHTTP',
  'HTTPHeaderMapping',
  'ConnectorErrors',
]);

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
        APOLLO_CONNECTORS_INPUT_TYPES.has(type.name)
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
      const newFieldName = APOLLO_CONNECTORS_INPUT_TYPES.has(typeName)
        ? fieldName
        : fieldNamesFn?.(fieldName) || fieldName;
      const withOriginalKeyFallback = (nextField: typeof fieldConfig) => {
        if (newFieldName === fieldName) {
          return nextField;
        }
        // Input fields cannot carry resolvers — rename the key only.
        if (!('args' in nextField) && !('resolve' in nextField)) {
          return nextField;
        }
        const originalResolve = 'resolve' in nextField ? nextField.resolve : undefined;
        return {
          ...nextField,
          resolve(source: any, args: any, context: any, info: any) {
            if (originalResolve) {
              return originalResolve(source, args, context, info);
            }
            if (source == null) {
              return null;
            }
            if (Object.prototype.hasOwnProperty.call(source, newFieldName)) {
              return source[newFieldName];
            }
            return source[fieldName];
          },
        };
      };
      if (!fieldArgumentNamesFn && !enumValuesFn) {
        return [newFieldName, withOriginalKeyFallback(fieldConfig)];
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
            withOriginalKeyFallback({
              ...fieldConfig,
              extensions: fieldExtensions,
              args: newArgs,
              astNode: undefined,
            }),
          ];
        }
        return [
          newFieldName,
          withOriginalKeyFallback({
            ...fieldConfig,
            args: newArgs,
          }),
        ];
      }
      return [newFieldName, withOriginalKeyFallback(fieldConfig)];
    };
  }
  if (enumValuesFn) {
    schemaMapper[MapperKind.ENUM_VALUE] = (valueConfig, _typeName, _schema, externalValue) => {
      const newExternalValue = enumValuesFn(externalValue);
      if (newExternalValue === externalValue) {
        return [newExternalValue, valueConfig];
      }
      // Keep the original JSON/wire value when the GraphQL enum name changes.
      // Connectors subgraphs cannot use Mesh stitching `@source(name:)` for this.
      const nextValue =
        valueConfig.value !== undefined && valueConfig.value !== externalValue
          ? valueConfig.value
          : externalValue;
      const existingDirectives = getDirectiveExtensions(valueConfig) || {};
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
    let next = mapSchema(schema, schemaMapper);
    if (enumValuesFn && !next.getDirective('enum')) {
      const config = next.toConfig();
      next = new GraphQLSchema({
        ...config,
        directives: [...config.directives, EnumValueDirective],
      });
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
