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
import { applyProtobufFieldRenames, applyProtobufTypeRenames } from './rename.js';
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

/** Connect `@link` scalars — same as String/ID: do not rename/prefix. */
const CONNECTORS_LINKED_SCALARS = new Set(['JSONSelection', 'URLPathTemplate']);

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
  const typeRenameMap = new Map<string, string>();
  if (typeNamesFn) {
    schemaMapper[MapperKind.TYPE] = type => {
      if (
        isSpecifiedScalarType(type) ||
        isFromGraphQLScalars(type.name) ||
        CONNECTORS_INPUT_TYPES.has(type.name) ||
        CONNECTORS_LINKED_SCALARS.has(type.name)
      ) {
        return type;
      }
      const newName = typeNamesFn(type.name);
      if (newName !== type.name) {
        typeRenameMap.set(type.name, newName);
      }
      return new (Object.getPrototypeOf(type).constructor)({
        ...type.toConfig(),
        name: newName,
      });
    };
  }
  /** Type-scoped field renames so `Movie.GET→get` does not rewrite `ConnectHTTP.GET`. */
  const fieldRenameMap = new Map<string, Map<string, string>>();
  if (fieldNamesFn || fieldArgumentNamesFn || enumValuesFn || typeNamesFn) {
    schemaMapper[MapperKind.FIELD] = (fieldConfig, fieldName, typeName) => {
      // Keep Connectors HTTP method / baseURL field names intact.
      const newFieldName = CONNECTORS_INPUT_TYPES.has(typeName)
        ? fieldName
        : fieldNamesFn?.(fieldName) || fieldName;
      if (newFieldName !== fieldName) {
        let typeFieldRenameMap = fieldRenameMap.get(typeName);
        if (!typeFieldRenameMap) {
          typeFieldRenameMap = new Map();
          fieldRenameMap.set(typeName, typeFieldRenameMap);
        }
        typeFieldRenameMap.set(fieldName, newFieldName);
      }
      const fieldDirectives = getDirectiveExtensions(fieldConfig);
      const argRenameMap = new Map<string, string>();
      let newArgs: GraphQLFieldConfigArgumentMap | undefined;
      if ('args' in fieldConfig && fieldConfig.args && (fieldArgumentNamesFn || enumValuesFn)) {
        newArgs = {};
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
      }
      const rewrittenDirectives = rewriteConnectArgReferences(
        fieldDirectives,
        argRenameMap,
        undefined,
        typeRenameMap.size ? typeRenameMap : undefined,
      );
      if (rewrittenDirectives !== fieldDirectives || newArgs) {
        const fieldExtensions: Record<string, any> = { ...(fieldConfig.extensions || {}) };
        if (rewrittenDirectives !== fieldDirectives) {
          fieldExtensions.directives = rewrittenDirectives;
        }
        return [
          newFieldName,
          withOriginalKeyFallback(
            {
              ...fieldConfig,
              ...(rewrittenDirectives !== fieldDirectives
                ? { extensions: fieldExtensions, astNode: undefined }
                : {}),
              ...(newArgs ? { args: newArgs } : {}),
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
    // Precompute before mapSchema so FIELD rewrites see the full type map
    // (TYPE/FIELD visit order is not guaranteed for `__typename` Connect arms).
    typeRenameMap.clear();
    if (typeNamesFn) {
      for (const type of Object.values(schema.getTypeMap())) {
        if (type.name.startsWith('__')) continue;
        if (
          isSpecifiedScalarType(type) ||
          isFromGraphQLScalars(type.name) ||
          CONNECTORS_INPUT_TYPES.has(type.name) ||
          CONNECTORS_LINKED_SCALARS.has(type.name)
        ) {
          continue;
        }
        const newName = typeNamesFn(type.name);
        if (newName !== type.name) {
          typeRenameMap.set(type.name, newName);
        }
      }
    }
    const connectors = schemaUsesConnect(schema);
    fieldRenameMap.clear();
    let next = mapSchema(schema, schemaMapper);
    if (fieldRenameMap.size && typeRenameMap.size) {
      const rekeyed = new Map<string, Map<string, string>>();
      for (const [originalName, fields] of fieldRenameMap) {
        const publicName = typeRenameMap.get(originalName) ?? originalName;
        let dest = rekeyed.get(publicName);
        if (!dest) {
          dest = new Map();
          rekeyed.set(publicName, dest);
        }
        for (const [oldField, newField] of fields) {
          dest.set(oldField, newField);
        }
      }
      fieldRenameMap.clear();
      for (const [typeName, fields] of rekeyed) {
        fieldRenameMap.set(typeName, fields);
      }
    }
    if (fieldRenameMap.size) {
      // Protobuf binds: type-scoped so ConnectHTTP.GET is not rewritten by Movie.GET→get.
      next = mapSchema(next, {
        [MapperKind.ROOT_FIELD]: (fieldConfig, _n, _t, s) =>
          applyProtobufFieldRenames(fieldConfig, fieldRenameMap, s),
        [MapperKind.OBJECT_FIELD]: (fieldConfig, _n, _t, s) =>
          applyProtobufFieldRenames(fieldConfig, fieldRenameMap, s),
        [MapperKind.OBJECT_TYPE]: (type, s) => applyProtobufTypeRenames(type, fieldRenameMap, s),
      });
      // Connect selection picks still use a flat name map; skip flat protobuf nested renames.
      const flatFieldRenameMap = new Map<string, string>();
      for (const fields of fieldRenameMap.values()) {
        for (const [from, to] of fields) {
          if (!flatFieldRenameMap.has(from)) {
            flatFieldRenameMap.set(from, to);
          }
        }
      }
      if (flatFieldRenameMap.size) {
        next = mapSchema(next, {
          [MapperKind.ROOT_FIELD]: (fieldConfig, _n, _t, s) => {
            const fieldDirectives = getDirectiveExtensions(fieldConfig, s);
            const rewritten = rewriteConnectArgReferences(
              fieldDirectives,
              new Map(),
              flatFieldRenameMap,
              undefined,
              false,
            );
            if (!rewritten || rewritten === fieldDirectives) {
              return fieldConfig;
            }
            return {
              ...fieldConfig,
              extensions: { ...(fieldConfig.extensions || {}), directives: rewritten },
              astNode: undefined,
            };
          },
          [MapperKind.OBJECT_FIELD]: (fieldConfig, _n, _t, s) => {
            const fieldDirectives = getDirectiveExtensions(fieldConfig, s);
            const rewritten = rewriteConnectArgReferences(
              fieldDirectives,
              new Map(),
              flatFieldRenameMap,
              undefined,
              false,
            );
            if (!rewritten || rewritten === fieldDirectives) {
              return fieldConfig;
            }
            return {
              ...fieldConfig,
              extensions: { ...(fieldConfig.extensions || {}), directives: rewritten },
              astNode: undefined,
            };
          },
        });
      }
    }
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
