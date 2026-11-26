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
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isSpecifiedScalarType,
  Kind,
  type ConstValueNode,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLInputObjectType,
  type GraphQLInputType,
  type ValueNode,
} from 'graphql';
import { resolvers } from 'graphql-scalars';
import {
  getDirectiveExtensions,
  MapperKind,
  mapSchema,
  type SchemaMapper,
} from '@graphql-tools/utils';
import { isNeo4jSubgraph, type SubgraphTransform } from '../compose.js';
import { bakeConnectEnumsInTransform } from './connect-enum-bake.js';
import {
  ensureNeo4jFieldAlias,
  ensureNeo4jTypeIdentity,
  isNeo4jModelTypeDirectives,
  rewriteNeo4jCypherArgReferences,
  rewriteNeo4jRelationshipPropertiesRefs,
  typeConfigWithDirectiveExtensions,
} from './neo4j-identity.js';
import { applyProtobufFieldRenames, applyProtobufTypeRenames } from './rename.js';
import {
  applyFlatDirectiveFieldRenames,
  applySqlTypeFieldRenames,
  rewriteConnectArgReferences,
  withOriginalKeyFallback,
} from './utils.js';

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

function containsEnumValueNode(node: ValueNode | null | undefined): boolean {
  if (!node) {
    return false;
  }
  if (node.kind === Kind.ENUM) {
    return true;
  }
  if (node.kind === Kind.LIST) {
    return node.values.some(containsEnumValueNode);
  }
  if (node.kind === Kind.OBJECT) {
    return node.fields.some(f => containsEnumValueNode(f.value));
  }
  return false;
}

type RenameFn = (value: string) => string;

function renameInputObjectFieldName(
  fieldName: string,
  parentTypeName: string,
  renameField?: RenameFn,
): string {
  if (!renameField || CONNECTORS_INPUT_TYPES.has(parentTypeName)) {
    return fieldName;
  }
  return renameField(fieldName);
}

function rewriteEnumValueNode(
  node: ValueNode,
  renameEnum?: RenameFn,
  renameField?: RenameFn,
  inputType?: GraphQLInputType,
): ValueNode {
  if (node.kind === Kind.ENUM) {
    return renameEnum ? { ...node, value: renameEnum(node.value) } : node;
  }
  let type = inputType;
  while (type && isNonNullType(type)) {
    type = type.ofType;
  }
  if (node.kind === Kind.LIST) {
    const ofType = type && isListType(type) ? type.ofType : undefined;
    return {
      ...node,
      values: node.values.map(v => rewriteEnumValueNode(v, renameEnum, renameField, ofType)),
    };
  }
  if (node.kind === Kind.OBJECT) {
    const named = type ? getNamedType(type) : undefined;
    const fields = isInputObjectType(named) ? named.getFields() : undefined;
    return {
      ...node,
      fields: node.fields.map(f => {
        const oldName = f.name.value;
        const field = fields?.[oldName];
        const newName =
          fields && named ? renameInputObjectFieldName(oldName, named.name, renameField) : oldName;
        return {
          ...f,
          name: newName !== oldName ? { ...f.name, value: newName } : f.name,
          value: rewriteEnumValueNode(f.value, renameEnum, renameField, field?.type),
        };
      }),
    };
  }
  return node;
}

function jsDefaultContainsString(value: unknown): boolean {
  if (typeof value === 'string') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(jsDefaultContainsString);
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(jsDefaultContainsString);
  }
  return false;
}

function jsDefaultNeedsInputFieldRename(
  value: unknown,
  inputType: GraphQLInputType,
  renameField?: RenameFn,
): boolean {
  if (!renameField) {
    return false;
  }
  let type: GraphQLInputType = inputType;
  while (isNonNullType(type)) {
    type = type.ofType;
  }
  if (isListType(type)) {
    return (
      Array.isArray(value) &&
      value.some(item => jsDefaultNeedsInputFieldRename(item, type.ofType, renameField))
    );
  }
  const named = getNamedType(type);
  if (!isInputObjectType(named) || !value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  if (CONNECTORS_INPUT_TYPES.has(named.name)) {
    return false;
  }
  const fields = named.getFields();
  for (const fieldName of Object.keys(value as Record<string, unknown>)) {
    if (!(fieldName in fields)) {
      continue;
    }
    if (renameInputObjectFieldName(fieldName, named.name, renameField) !== fieldName) {
      return true;
    }
    if (
      jsDefaultNeedsInputFieldRename(
        (value as Record<string, unknown>)[fieldName],
        fields[fieldName].type,
        renameField,
      )
    ) {
      return true;
    }
  }
  return false;
}

function rewriteEnumJsDefault(value: unknown, rename: RenameFn): unknown {
  if (typeof value === 'string') {
    return rename(value);
  }
  if (Array.isArray(value)) {
    return value.map(v => rewriteEnumJsDefault(v, rename));
  }
  return value;
}

function rewriteJsDefaultForInputType(
  value: unknown,
  inputType: GraphQLInputType,
  renameEnum?: RenameFn,
  renameField?: RenameFn,
  /** When false, keep enum leaves as internal values (fusion `defaultValue`). */
  renameEnumLeaves = true,
): unknown {
  let type: GraphQLInputType = inputType;
  while (isNonNullType(type)) {
    type = type.ofType;
  }
  if (isListType(type)) {
    if (!Array.isArray(value)) {
      return value;
    }
    const ofType = type.ofType;
    return value.map(item =>
      rewriteJsDefaultForInputType(item, ofType, renameEnum, renameField, renameEnumLeaves),
    );
  }
  const named = getNamedType(type);
  if (isEnumType(named)) {
    return typeof value === 'string' && renameEnum && renameEnumLeaves ? renameEnum(value) : value;
  }
  if (isInputObjectType(named) && value && typeof value === 'object' && !Array.isArray(value)) {
    const fields = (named as GraphQLInputObjectType).getFields();
    const out: Record<string, unknown> = {};
    for (const [fieldName, field] of Object.entries(fields)) {
      if (!(fieldName in (value as Record<string, unknown>))) {
        continue;
      }
      const newName = renameInputObjectFieldName(fieldName, named.name, renameField);
      out[newName] = rewriteJsDefaultForInputType(
        (value as Record<string, unknown>)[fieldName],
        field.type,
        renameEnum,
        renameField,
        renameEnumLeaves,
      );
    }
    return out;
  }
  return value;
}

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

  return function namingConventionTransform(schema: GraphQLSchema) {
    // Mapper + rename maps are per invocation so a nested transform call (e.g. from a
    // custom `fieldNames` callback) cannot flip Neo4j transport gating for the outer call.
    const neo4jSubgraph = isNeo4jSubgraph(schema);
    const schemaMapper: SchemaMapper = {};
    const typeRenameMap = new Map<string, string>();
    /** Type-scoped field renames so `Movie.GET→get` does not rewrite `ConnectHTTP.GET`. */
    const fieldRenameMap = new Map<string, Map<string, string>>();
    /** Public `Type.field` → arg rename map (for root-field `$this` args fallback). */
    const argRenamesByPublicField = new Map<string, Map<string, string>>();

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
        const typeDirectives = getDirectiveExtensions(type);
        const newName = typeNamesFn(type.name);
        if (newName === type.name) {
          return type;
        }
        typeRenameMap.set(type.name, newName);
        const withNeo4jIdentity = neo4jSubgraph
          ? ensureNeo4jTypeIdentity(typeDirectives, type.name)
          : typeDirectives;
        if (withNeo4jIdentity !== typeDirectives && withNeo4jIdentity) {
          return new (Object.getPrototypeOf(type).constructor)({
            ...typeConfigWithDirectiveExtensions(type, withNeo4jIdentity),
            name: newName,
          });
        }
        return new (Object.getPrototypeOf(type).constructor)({
          ...type.toConfig(),
          name: newName,
        });
      };
    }
    if (fieldNamesFn || fieldArgumentNamesFn || enumValuesFn || typeNamesFn) {
      schemaMapper[MapperKind.FIELD] = (fieldConfig, fieldName, typeName, fieldSchema) => {
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
        // Neo4j regenerates relationship filter/pagination args (`where`, …); renaming
        // them (e.g. `where`→`Where`) leaves the public schema without a matching executor arg.
        // Authored `@cypher` args are retained by the transport and stay renamable.
        const skipNeo4jRelationshipArgRename =
          neo4jSubgraph && Boolean(fieldDirectives?.relationship?.length);
        if (
          'args' in fieldConfig &&
          fieldConfig.args &&
          (fieldArgumentNamesFn || enumValuesFn || fieldNamesFn)
        ) {
          newArgs = {};
          for (const argName in fieldConfig.args) {
            const newArgName = skipNeo4jRelationshipArgRename
              ? argName
              : fieldArgumentNamesFn?.(argName) || argName;
            if (newArgName !== argName) {
              argRenameMap.set(argName, newArgName);
            }
            const argConfig = fieldConfig.args[argName] as (typeof fieldConfig.args)[string] & {
              default?: { literal?: ConstValueNode; value?: unknown };
            };
            const namedArgType = getNamedType(argConfig.type);
            const inputType = argConfig.type as GraphQLInputType;
            const needsEnumRewrite =
              !!enumValuesFn && (isEnumType(namedArgType) || isInputObjectType(namedArgType));
            const needsKeyRewrite =
              !!fieldNamesFn &&
              isInputObjectType(namedArgType) &&
              (jsDefaultNeedsInputFieldRename(argConfig.defaultValue, inputType, fieldNamesFn) ||
                jsDefaultNeedsInputFieldRename(argConfig.default?.value, inputType, fieldNamesFn) ||
                (argConfig.default?.literal != null &&
                  containsEnumValueNode(argConfig.default.literal)) ||
                (argConfig.astNode?.defaultValue != null &&
                  (containsEnumValueNode(argConfig.astNode.defaultValue) ||
                    argConfig.astNode.defaultValue.kind === Kind.OBJECT)));
            if (!needsEnumRewrite && !needsKeyRewrite) {
              newArgs[newArgName] = argConfig;
              continue;
            }
            // Explicit null must not fall back to a stale AST enum default.
            const hasJsStringDefault =
              argConfig.defaultValue != null && jsDefaultContainsString(argConfig.defaultValue);
            const hasDefaultValue =
              argConfig.defaultValue !== undefined || argConfig.default != null;
            const literal: ValueNode | undefined =
              argConfig.default?.literal ??
              (!hasDefaultValue ? argConfig.astNode?.defaultValue : undefined);
            const hasLiteralEnum = containsEnumValueNode(literal);
            const hasValueString =
              argConfig.default?.value != null && jsDefaultContainsString(argConfig.default.value);
            const hasObjectLiteral = literal?.kind === Kind.OBJECT || literal?.kind === Kind.LIST;
            if (argConfig.defaultValue === null) {
              newArgs[newArgName] = argConfig;
              continue;
            }
            if (
              !hasJsStringDefault &&
              !hasLiteralEnum &&
              !hasValueString &&
              !needsKeyRewrite &&
              !hasObjectLiteral
            ) {
              newArgs[newArgName] = argConfig;
              continue;
            }
            const nextArg: typeof argConfig = { ...argConfig };
            // `defaultValue` holds internal enum values — rename keys only, not enum leaves.
            if (
              argConfig.defaultValue != null &&
              (hasJsStringDefault || needsKeyRewrite) &&
              isInputObjectType(namedArgType)
            ) {
              nextArg.defaultValue = rewriteJsDefaultForInputType(
                argConfig.defaultValue,
                inputType,
                enumValuesFn,
                fieldNamesFn,
                false,
              ) as typeof argConfig.defaultValue;
            } else if (hasJsStringDefault && isEnumType(namedArgType)) {
              // Leave coerced internal defaultValue alone (fusion keeps original wire value).
            }
            if (
              argConfig.default?.literal &&
              (containsEnumValueNode(argConfig.default.literal) ||
                argConfig.default.literal.kind === Kind.OBJECT ||
                needsKeyRewrite)
            ) {
              nextArg.default = {
                literal: rewriteEnumValueNode(
                  argConfig.default.literal,
                  enumValuesFn,
                  fieldNamesFn,
                  inputType,
                ) as ConstValueNode,
              };
            } else if (hasValueString || (needsKeyRewrite && argConfig.default?.value != null)) {
              nextArg.default = {
                value: isInputObjectType(namedArgType)
                  ? rewriteJsDefaultForInputType(
                      argConfig.default!.value,
                      inputType,
                      enumValuesFn,
                      fieldNamesFn,
                      true,
                    )
                  : rewriteEnumJsDefault(argConfig.default!.value, enumValuesFn!),
              };
            } else if (argConfig.default != null && (hasLiteralEnum || hasValueString)) {
              nextArg.default = undefined;
            }
            if (
              argConfig.astNode?.defaultValue &&
              (containsEnumValueNode(argConfig.astNode.defaultValue) ||
                argConfig.astNode.defaultValue.kind === Kind.OBJECT ||
                needsKeyRewrite)
            ) {
              nextArg.astNode = {
                ...argConfig.astNode,
                defaultValue: rewriteEnumValueNode(
                  argConfig.astNode.defaultValue,
                  enumValuesFn,
                  fieldNamesFn,
                  inputType,
                ) as typeof argConfig.astNode.defaultValue,
              };
            }
            newArgs[newArgName] = nextArg;
          }
        }
        if (argRenameMap.size) {
          const publicType = typeRenameMap.get(typeName) ?? typeName;
          argRenamesByPublicField.set(`${publicType}.${newFieldName}`, argRenameMap);
        }
        // Defer protobuf `$args` rewrites to `applyProtobufFieldRenames` (single pass).
        // Neo4j (transport-gated) rewrites `@cypher` `$arg` binds and stamps `@alias(property:)`.
        let rewrittenDirectives = rewriteConnectArgReferences(
          fieldDirectives,
          argRenameMap,
          undefined,
          typeRenameMap.size ? typeRenameMap : undefined,
          false,
        );
        if (neo4jSubgraph) {
          rewrittenDirectives = rewriteNeo4jCypherArgReferences(rewrittenDirectives, argRenameMap);
          rewrittenDirectives = rewriteNeo4jRelationshipPropertiesRefs(
            rewrittenDirectives,
            typeRenameMap,
          );
          if (newFieldName !== fieldName) {
            const parentType = fieldSchema?.getType(typeName);
            const parentDirs = parentType ? getDirectiveExtensions(parentType) : undefined;
            const isRootParent =
              typeName === 'Query' || typeName === 'Mutation' || typeName === 'Subscription';
            // Never stamp `@alias` on input fields (`@alias` is FIELD_DEFINITION only).
            if (!isRootParent && !isInputObjectType(parentType as any)) {
              rewrittenDirectives = ensureNeo4jFieldAlias(rewrittenDirectives, fieldName, {
                isNeo4jModelField: isNeo4jModelTypeDirectives(parentDirs),
                // Authored Cypher return objects need `@alias` so map keys survive fieldNames renames.
                allowNonModelPropertyAlias: true,
                parentIsObjectOrInterface:
                  isObjectType(parentType as any) || isInterfaceType(parentType as any),
                subgraph:
                  parentDirs?.node?.[0]?.subgraph ||
                  parentDirs?.relationshipProperties?.[0]?.subgraph,
              });
            }
          }
        }
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
    if (enumValuesFn || fieldNamesFn) {
      // Preferential over MapperKind.FIELD for input objects — must also apply fieldNames
      // renames or snake_case input fields never become camelCase on the public schema.
      schemaMapper[MapperKind.INPUT_OBJECT_FIELD] = (inputFieldConfig, fieldName, typeName) => {
        if (CONNECTORS_INPUT_TYPES.has(typeName)) {
          return undefined;
        }
        const newFieldName = fieldNamesFn?.(fieldName) || fieldName;
        if (newFieldName !== fieldName) {
          let typeFieldRenameMap = fieldRenameMap.get(typeName);
          if (!typeFieldRenameMap) {
            typeFieldRenameMap = new Map();
            fieldRenameMap.set(typeName, typeFieldRenameMap);
          }
          typeFieldRenameMap.set(fieldName, newFieldName);
        }
        if (!enumValuesFn && !fieldNamesFn) {
          return newFieldName === fieldName ? undefined : [newFieldName, inputFieldConfig];
        }
        const namedFieldType = getNamedType(inputFieldConfig.type);
        const fieldCfg = inputFieldConfig as typeof inputFieldConfig & {
          default?: { literal?: ConstValueNode; value?: unknown };
        };
        const inputType = fieldCfg.type as GraphQLInputType;
        const canRewriteDefault =
          (isEnumType(namedFieldType) || isInputObjectType(namedFieldType)) &&
          fieldCfg.defaultValue !== null &&
          ((fieldCfg.defaultValue != null &&
            (jsDefaultContainsString(fieldCfg.defaultValue) ||
              jsDefaultNeedsInputFieldRename(fieldCfg.defaultValue, inputType, fieldNamesFn))) ||
            (fieldCfg.default?.literal &&
              (containsEnumValueNode(fieldCfg.default.literal) ||
                fieldCfg.default.literal.kind === Kind.OBJECT)) ||
            (fieldCfg.default?.value != null &&
              (jsDefaultContainsString(fieldCfg.default.value) ||
                jsDefaultNeedsInputFieldRename(fieldCfg.default.value, inputType, fieldNamesFn))) ||
            (fieldCfg.astNode?.defaultValue &&
              (containsEnumValueNode(fieldCfg.astNode.defaultValue) ||
                fieldCfg.astNode.defaultValue.kind === Kind.OBJECT)));
        let nextConfig: typeof inputFieldConfig = inputFieldConfig;
        if (canRewriteDefault) {
          const next = { ...fieldCfg };
          // Keep internal enum leaves on defaultValue; rename input keys when needed.
          if (
            fieldCfg.defaultValue != null &&
            isInputObjectType(namedFieldType) &&
            (jsDefaultContainsString(fieldCfg.defaultValue) ||
              jsDefaultNeedsInputFieldRename(fieldCfg.defaultValue, inputType, fieldNamesFn))
          ) {
            next.defaultValue = rewriteJsDefaultForInputType(
              fieldCfg.defaultValue,
              inputType,
              enumValuesFn,
              fieldNamesFn,
              false,
            ) as typeof fieldCfg.defaultValue;
          }
          if (
            fieldCfg.default?.literal &&
            (containsEnumValueNode(fieldCfg.default.literal) ||
              fieldCfg.default.literal.kind === Kind.OBJECT)
          ) {
            next.default = {
              literal: rewriteEnumValueNode(
                fieldCfg.default.literal,
                enumValuesFn,
                fieldNamesFn,
                inputType,
              ) as ConstValueNode,
            };
          } else if (
            fieldCfg.default?.value != null &&
            (jsDefaultContainsString(fieldCfg.default.value) ||
              jsDefaultNeedsInputFieldRename(fieldCfg.default.value, inputType, fieldNamesFn))
          ) {
            next.default = {
              value: isInputObjectType(namedFieldType)
                ? rewriteJsDefaultForInputType(
                    fieldCfg.default!.value,
                    inputType,
                    enumValuesFn,
                    fieldNamesFn,
                    true,
                  )
                : enumValuesFn
                  ? rewriteEnumJsDefault(fieldCfg.default.value, enumValuesFn)
                  : fieldCfg.default.value,
            };
          }
          if (
            fieldCfg.astNode?.defaultValue &&
            (containsEnumValueNode(fieldCfg.astNode.defaultValue) ||
              fieldCfg.astNode.defaultValue.kind === Kind.OBJECT)
          ) {
            next.astNode = {
              ...fieldCfg.astNode,
              defaultValue: rewriteEnumValueNode(
                fieldCfg.astNode.defaultValue,
                enumValuesFn,
                fieldNamesFn,
                inputType,
              ) as typeof fieldCfg.astNode.defaultValue,
            };
          }
          nextConfig = next;
        }
        if (newFieldName === fieldName) {
          return nextConfig === inputFieldConfig ? undefined : nextConfig;
        }
        return [newFieldName, nextConfig];
      };
    }
    if (enumValuesFn) {
      schemaMapper[MapperKind.DIRECTIVE] = directive => {
        if (directive.name.startsWith('__') || directive.args.length === 0) {
          return directive;
        }
        const config = directive.toConfig();
        let changed = false;
        const nextArgs: typeof config.args = {};
        for (const [argName, argConfig] of Object.entries(config.args)) {
          const typedArg = argConfig as typeof argConfig & {
            default?: { literal?: ConstValueNode; value?: unknown };
          };
          const namedArgType = getNamedType(typedArg.type);
          if (!isEnumType(namedArgType) && !isInputObjectType(namedArgType)) {
            nextArgs[argName] = argConfig;
            continue;
          }
          if (typedArg.defaultValue === null) {
            nextArgs[argName] = argConfig;
            continue;
          }
          const hasJsStringDefault =
            typedArg.defaultValue != null && jsDefaultContainsString(typedArg.defaultValue);
          const hasDefaultValue = typedArg.defaultValue !== undefined || typedArg.default != null;
          const literal: ValueNode | undefined =
            typedArg.default?.literal ??
            (!hasDefaultValue ? typedArg.astNode?.defaultValue : undefined);
          const hasLiteralEnum = containsEnumValueNode(literal);
          const hasValueString =
            typedArg.default?.value != null && jsDefaultContainsString(typedArg.default.value);
          if (!hasJsStringDefault && !hasLiteralEnum && !hasValueString) {
            nextArgs[argName] = argConfig;
            continue;
          }
          changed = true;
          const inputType = typedArg.type as GraphQLInputType;
          const next = { ...typedArg };
          if (
            typedArg.default?.literal &&
            (containsEnumValueNode(typedArg.default.literal) ||
              typedArg.default.literal.kind === Kind.OBJECT)
          ) {
            next.default = {
              literal: rewriteEnumValueNode(
                typedArg.default.literal,
                enumValuesFn,
                fieldNamesFn,
                inputType,
              ) as ConstValueNode,
            };
          } else if (hasValueString) {
            next.default = {
              value: isInputObjectType(namedArgType)
                ? rewriteJsDefaultForInputType(
                    typedArg.default!.value,
                    inputType,
                    enumValuesFn,
                    fieldNamesFn,
                    true,
                  )
                : rewriteEnumJsDefault(typedArg.default!.value, enumValuesFn),
            };
          }
          if (
            typedArg.astNode?.defaultValue &&
            (containsEnumValueNode(typedArg.astNode.defaultValue) ||
              typedArg.astNode.defaultValue.kind === Kind.OBJECT)
          ) {
            next.astNode = {
              ...typedArg.astNode,
              defaultValue: rewriteEnumValueNode(
                typedArg.astNode.defaultValue,
                enumValuesFn,
                fieldNamesFn,
                inputType,
              ) as typeof typedArg.astNode.defaultValue,
            };
          }
          nextArgs[argName] = next;
        }
        if (!changed) {
          return directive;
        }
        return new GraphQLDirective({
          ...config,
          args: nextArgs,
        });
      };
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

    // Precompute before mapSchema so FIELD rewrites see the full type map
    // (TYPE/FIELD visit order is not guaranteed for `__typename` Connect arms).
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
    // Protobuf binds even when only args rename (no field renames): dual `$this|$args`.
    if (fieldRenameMap.size || argRenamesByPublicField.size) {
      // Type-scoped so ConnectHTTP.GET is not rewritten by Movie.GET→get.
      next = mapSchema(next, {
        [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName, typeName, s) =>
          applyProtobufFieldRenames(
            fieldConfig,
            fieldRenameMap,
            s,
            typeName,
            argRenamesByPublicField.get(`${typeName}.${fieldName}`),
          ),
        [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName, s) =>
          applyProtobufFieldRenames(
            fieldConfig,
            fieldRenameMap,
            s,
            typeName,
            argRenamesByPublicField.get(`${typeName}.${fieldName}`),
          ),
        [MapperKind.OBJECT_TYPE]: (type, s) => applyProtobufTypeRenames(type, fieldRenameMap, s),
      });
    }
    if (fieldRenameMap.size) {
      // Connect selection picks still use a flat name map; skip flat protobuf nested renames.
      // SQL type-level `@sql` uses the type-scoped map so `User.name→displayName` updates
      // the entity selection before Mesh `@source` is skipped.
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
          [MapperKind.ROOT_FIELD]: (fieldConfig, _n, _t, s) =>
            applyFlatDirectiveFieldRenames(fieldConfig, flatFieldRenameMap, s),
          [MapperKind.OBJECT_FIELD]: (fieldConfig, _n, _t, s) =>
            applyFlatDirectiveFieldRenames(fieldConfig, flatFieldRenameMap, s),
          [MapperKind.OBJECT_TYPE]: (type, s) =>
            applySqlTypeFieldRenames(type, fieldRenameMap.get(type.name), s),
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
