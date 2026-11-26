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
  isInputObjectType,
  isListType,
  isNonNullType,
  Kind,
  type ConstValueNode,
  type GraphQLArgumentConfig,
  type GraphQLEnumType,
  type GraphQLInputObjectType,
  type GraphQLInputType,
  type ValueNode,
} from 'graphql';
import { resolvers as scalarsResolversMap } from 'graphql-scalars';
import { lowerCase } from 'lower-case';
import { upperCase } from 'upper-case';
import type { YamlConfig } from '@graphql-mesh/types';

type NamingConventionFn = (input: string) => string;
type NamingConventionType = YamlConfig.NamingConventionTransformConfig['typeNames'];

export const NAMING_CONVENTIONS: Record<NamingConventionType, NamingConventionFn> = {
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
};

// Ignore fields needed by Federation spec
export const IGNORED_ROOT_FIELD_NAMES = ['_service', '_entities'];

/**
 * Types whose names (and input fields) must stay as authored.
 * Includes Apollo Connectors v0.4 shapes (`ConnectHTTP.GET`, etc.): `pascalCase` /
 * `camelCase` would turn them into `ConnectHttp` / `get`, which GraphQL 17 then
 * rejects when directive ASTs still use the original uppercase field names.
 */
export const IGNORED_TYPE_NAMES = [
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
  // Apollo Connectors / Mesh `@connect` / `@source` (see federationConnectDirectives)
  'ConnectHTTP',
  'SourceHTTP',
  'HTTPHeaderMapping',
  'ConnectorErrors',
  'JSONSelection',
  'URLPathTemplate',
  ...Object.keys(scalarsResolversMap),
];

type EnumDefaultConfig = Pick<GraphQLArgumentConfig, 'defaultValue' | 'astNode'> & {
  default?: { literal?: ConstValueNode; value?: unknown };
};

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

function renameInputObjectFieldName(
  fieldName: string,
  parentTypeName: string,
  renameField?: NamingConventionFn,
): string {
  if (!renameField || IGNORED_TYPE_NAMES.includes(parentTypeName)) {
    return fieldName;
  }
  // camelCase("_") → ""; keep the original key so defaults stay valid.
  return renameField(fieldName) || fieldName;
}

/** GraphQL list coercion accepts iterables; strings must stay singletons. */
function isListIterable(value: unknown): boolean {
  return (
    value != null &&
    typeof value !== 'string' &&
    typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function'
  );
}

/**
 * Map a legacy `defaultValue` wire/internal value to the renamed member name.
 * Prefer wire matches so `other: { value: 'newbie' }` wins over the name `newbie`
 * when GraphQL 16 stored the internal value.
 */
function mapEnumWireDefault(
  value: unknown,
  enumType: GraphQLEnumType,
  rename: NamingConventionFn,
): unknown {
  if (typeof value === 'string') {
    const values = enumType.toConfig().values;
    for (const [name, cfg] of Object.entries(values)) {
      const wire = cfg.value !== undefined ? cfg.value : name;
      if (wire === value) {
        return rename(name);
      }
    }
    if (Object.prototype.hasOwnProperty.call(values, value)) {
      return rename(value);
    }
    return rename(value);
  }
  if (Array.isArray(value)) {
    return value.map(v => mapEnumWireDefault(v, enumType, rename));
  }
  return value;
}

/**
 * Map a GraphQL 17 `default.value` external enum name to the renamed member name.
 * Prefer name matches so `default: { value: 'newbie' }` stays on member `newbie`
 * even when another member uses `'newbie'` as its wire value.
 */
function mapEnumExternalDefault(
  value: unknown,
  enumType: GraphQLEnumType,
  rename: NamingConventionFn,
): unknown {
  if (typeof value === 'string') {
    const values = enumType.toConfig().values;
    if (Object.prototype.hasOwnProperty.call(values, value)) {
      return rename(value);
    }
    return mapEnumWireDefault(value, enumType, rename);
  }
  if (Array.isArray(value)) {
    return value.map(v => mapEnumExternalDefault(v, enumType, rename));
  }
  return value;
}

function rewriteEnumValueNode(
  node: ValueNode,
  renameEnum: NamingConventionFn,
  renameField?: NamingConventionFn,
  inputType?: GraphQLInputType,
): ValueNode {
  if (node.kind === Kind.ENUM) {
    if (inputType != null) {
      const named = getNamedType(inputType);
      // EnumValue tokens on custom scalars must stay intact.
      return isEnumType(named) ? { ...node, value: renameEnum(node.value) } : node;
    }
    return { ...node, value: renameEnum(node.value) };
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
        const newName =
          fields && named ? renameInputObjectFieldName(oldName, named.name, renameField) : oldName;
        // After RenameInputObjectFields, lookup may only hit the renamed key.
        const field = fields?.[oldName] ?? fields?.[newName];
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

/** Recursive string detect for nested JS defaults (lists / plain objects). */
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

function rewriteEnumJsDefault(value: unknown, rename: NamingConventionFn): unknown {
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
  renameEnum: NamingConventionFn,
  renameField?: NamingConventionFn,
  /** When true, treat string enum leaves as GraphQL 17 external names (not wire). */
  externalEnumNames = false,
): unknown {
  let type: GraphQLInputType = inputType;
  while (isNonNullType(type)) {
    type = type.ofType;
  }
  if (isListType(type)) {
    const ofType = type.ofType;
    if (Array.isArray(value)) {
      return value.map(item =>
        rewriteJsDefaultForInputType(item, ofType, renameEnum, renameField, externalEnumNames),
      );
    }
    // Set/other iterables: leave intact (GraphQL coerces); do not wrap as [Set].
    if (isListIterable(value)) {
      return value;
    }
    // Singleton list default (`{ retry_count: 3 }` for `[Filter]`).
    return value == null
      ? value
      : [rewriteJsDefaultForInputType(value, ofType, renameEnum, renameField, externalEnumNames)];
  }
  const named = getNamedType(type);
  if (isEnumType(named)) {
    if (typeof value !== 'string') {
      return value;
    }
    return externalEnumNames
      ? mapEnumExternalDefault(value, named, renameEnum)
      : mapEnumWireDefault(value, named, renameEnum);
  }
  if (isInputObjectType(named) && value && typeof value === 'object' && !Array.isArray(value)) {
    const fields = (named as GraphQLInputObjectType).getFields();
    const out: Record<string, unknown> = {};
    // Iterate defaultValue keys (may still be pre-rename, e.g. wrap mode after
    // RenameInputObjectFields already renamed the input type fields).
    for (const [valueKey, raw] of Object.entries(value as Record<string, unknown>)) {
      const renamedKey = renameInputObjectFieldName(valueKey, named.name, renameField);
      // Prefer the original key: a custom rename can map onto another original field name.
      const field = fields[valueKey] ?? fields[renamedKey];
      if (!field) {
        // Wrap mode: input type fields may already be renamed while default keys
        // are still pre-rename. Keep the value under the renamed key rather than
        // dropping unmatched keys (would turn `{ outer_field: … }` into `{}`).
        out[renamedKey] = raw;
        continue;
      }
      out[renamedKey] = rewriteJsDefaultForInputType(
        raw,
        field.type,
        renameEnum,
        renameField,
        externalEnumNames,
      );
    }
    return out;
  }
  return value;
}

/**
 * GraphQL 16 stores enum arg defaults on `defaultValue` (string / string[]).
 * GraphQL 17 often leaves `defaultValue` unset and keeps `default.literal` /
 * `default.value` / AST instead (including ListValue of enums).
 *
 * An explicit `defaultValue: null` (or a present `default` object without a
 * usable enum string/list) must not fall back to a stale AST default.
 */
export function getEnumDefaultName(config: EnumDefaultConfig): string | undefined {
  if (typeof config.defaultValue === 'string') {
    return config.defaultValue;
  }
  // Explicit non-string defaultValue (typically null) — preserve; no AST fallback.
  if (config.defaultValue !== undefined) {
    return undefined;
  }
  if (typeof config.default?.value === 'string') {
    return config.default.value;
  }
  if (config.default?.literal?.kind === Kind.ENUM) {
    return config.default.literal.value;
  }
  // Authoritative `default` present but not a single renameable enum string — no AST fallback.
  if (config.default != null) {
    return undefined;
  }
  const literal = config.astNode?.defaultValue;
  if (literal?.kind === Kind.ENUM) {
    return literal.value;
  }
  return undefined;
}

/** True when the arg has a (possibly nested list/object) enum default worth renaming. */
export function hasRewritableEnumDefault(config: EnumDefaultConfig): boolean {
  if (typeof config.defaultValue === 'string') {
    return true;
  }
  if (config.defaultValue !== undefined) {
    // Explicit null — preserve. Nested lists/objects: recursive string detect.
    if (config.defaultValue === null) {
      return false;
    }
    return jsDefaultContainsString(config.defaultValue);
  }
  if (typeof config.default?.value === 'string') {
    return true;
  }
  if (config.default?.value !== undefined && config.default.value !== null) {
    if (jsDefaultContainsString(config.default.value)) {
      return true;
    }
  }
  if (config.default?.literal && containsEnumValueNode(config.default.literal)) {
    return true;
  }
  if (config.default != null) {
    return false;
  }
  return containsEnumValueNode(config.astNode?.defaultValue);
}

/** True when a JS/literal default has input-object keys that `renameField` would change. */
function jsDefaultNeedsInputFieldRename(
  value: unknown,
  inputType: GraphQLInputType,
  renameField?: NamingConventionFn,
): boolean {
  if (!renameField) {
    return false;
  }
  let type: GraphQLInputType = inputType;
  while (isNonNullType(type)) {
    type = type.ofType;
  }
  if (isListType(type)) {
    // GraphQL 17 may store a singleton list default as a bare item value.
    if (Array.isArray(value)) {
      return value.some(item => jsDefaultNeedsInputFieldRename(item, type.ofType, renameField));
    }
    if (isListIterable(value)) {
      return Array.from(value as Iterable<unknown>).some(item =>
        jsDefaultNeedsInputFieldRename(item, type.ofType, renameField),
      );
    }
    return value != null && jsDefaultNeedsInputFieldRename(value, type.ofType, renameField);
  }
  const named = getNamedType(type);
  if (!isInputObjectType(named) || !value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const fields = named.getFields();
  for (const fieldName of Object.keys(value as Record<string, unknown>)) {
    const renamed = renameInputObjectFieldName(fieldName, named.name, renameField);
    if (!(fieldName in fields) && !(renamed in fields)) {
      continue;
    }
    if (renamed !== fieldName) {
      return true;
    }
    if (
      jsDefaultNeedsInputFieldRename(
        (value as Record<string, unknown>)[fieldName],
        fields[fieldName]?.type ?? fields[renamed]?.type,
        renameField,
      )
    ) {
      return true;
    }
  }
  return false;
}

function configDefaultNeedsKeyRename(
  config: EnumDefaultConfig,
  inputType: GraphQLInputType,
  renameField?: NamingConventionFn,
): boolean {
  if (!renameField) {
    return false;
  }
  // GraphQL 17 prefers `default`; an explicit null there is the active default —
  // do not admit a rewrite based on a legacy `defaultValue` object.
  if (config.default != null && config.default.value === null && config.default.literal == null) {
    return false;
  }
  if (
    config.defaultValue != null &&
    jsDefaultNeedsInputFieldRename(config.defaultValue, inputType, renameField)
  ) {
    return true;
  }
  if (
    config.default?.value != null &&
    jsDefaultNeedsInputFieldRename(config.default.value, inputType, renameField)
  ) {
    return true;
  }
  // Prefer explicit GQL17 `default` / `defaultValue` over a stale AST (e.g. value: null).
  const literal =
    config.default?.literal ??
    (config.default == null && config.defaultValue === undefined
      ? config.astNode?.defaultValue
      : undefined);
  if (literal && (literal.kind === Kind.OBJECT || literal.kind === Kind.LIST)) {
    // OBJECT/LIST literals always need a pass when fieldNames is set so keys rename.
    return true;
  }
  return false;
}

/**
 * Like {@link hasRewritableEnumDefault}, but for input-object args
 * (`Filter = { status: newbie }`) uses the GraphQL input type to decide.
 * When `renameField` is set, also admits key-only defaults (`{ retry_count: 3 }`)
 * that have no string/enum leaves.
 */
export function hasRewritableEnumDefaultForType(
  config: EnumDefaultConfig,
  inputType: GraphQLInputType,
  renameField?: NamingConventionFn,
): boolean {
  const named = getNamedType(inputType);
  if (isEnumType(named)) {
    return hasRewritableEnumDefault(config);
  }
  if (!isInputObjectType(named)) {
    return false;
  }
  if (hasRewritableEnumDefault(config)) {
    return true;
  }
  return configDefaultNeedsKeyRename(config, inputType, renameField);
}

/**
 * Rewrite enum defaults for GraphQL 16 (`defaultValue`) and 17 (`default` /
 * AST), including nested list defaults like `[newbie]`.
 */
export function withRenamedEnumDefaults<T extends EnumDefaultConfig>(
  config: T,
  rename: NamingConventionFn,
): T {
  const next: T = { ...config };
  if (typeof config.defaultValue === 'string' || Array.isArray(config.defaultValue)) {
    next.defaultValue = rewriteEnumJsDefault(config.defaultValue, rename) as T['defaultValue'];
  }
  if (config.default?.literal && containsEnumValueNode(config.default.literal)) {
    // Literal-only arm: carrying a string `value` makes printSchema emit `"NEWBIE"`.
    next.default = {
      literal: rewriteEnumValueNode(config.default.literal, rename) as ConstValueNode,
    };
  } else if (typeof config.default?.value === 'string' || Array.isArray(config.default?.value)) {
    next.default = {
      value: rewriteEnumJsDefault(config.default.value, rename),
    };
  } else if (config.default != null) {
    // Drop uncoerced default so `defaultValue` wins when the schema is rebuilt.
    next.default = undefined;
  }
  if (config.astNode?.defaultValue && containsEnumValueNode(config.astNode.defaultValue)) {
    next.astNode = {
      ...config.astNode,
      defaultValue: rewriteEnumValueNode(config.astNode.defaultValue, rename) as ConstValueNode,
    };
  }
  return next;
}

/**
 * Rewrite defaults using the GraphQL input type so input-object arg defaults
 * (`filter: Filter = { status: newbie }`) only rename enum fields.
 */
export function withRenamedEnumDefaultsForType<T extends EnumDefaultConfig>(
  config: T,
  inputType: GraphQLInputType,
  rename: NamingConventionFn,
  renameField?: NamingConventionFn,
): T {
  const named = getNamedType(inputType);
  if (isEnumType(named)) {
    // Resolve wire values via the (original) enum members, then rename the member name —
    // do not upperCase('wire') when newbie → value 'wire'.
    const next: T = { ...config };
    if (typeof config.defaultValue === 'string' || Array.isArray(config.defaultValue)) {
      next.defaultValue = mapEnumWireDefault(
        config.defaultValue,
        named,
        rename,
      ) as T['defaultValue'];
    }
    if (config.default?.literal && containsEnumValueNode(config.default.literal)) {
      next.default = {
        literal: rewriteEnumValueNode(
          config.default.literal,
          rename,
          renameField,
          inputType,
        ) as ConstValueNode,
      };
    } else if (typeof config.default?.value === 'string' || Array.isArray(config.default?.value)) {
      next.default = {
        value: mapEnumExternalDefault(config.default.value, named, rename),
      };
    } else if (config.default != null && config.default.value === null) {
      next.default = { value: null };
    } else if (config.default != null) {
      next.default = undefined;
    }
    if (config.astNode?.defaultValue && containsEnumValueNode(config.astNode.defaultValue)) {
      next.astNode = {
        ...config.astNode,
        defaultValue: rewriteEnumValueNode(
          config.astNode.defaultValue,
          rename,
          renameField,
          inputType,
        ) as ConstValueNode,
      };
    }
    return next;
  }
  if (!isInputObjectType(named)) {
    return config;
  }
  const next: T = { ...config };
  if (config.defaultValue != null) {
    next.defaultValue = rewriteJsDefaultForInputType(
      config.defaultValue,
      inputType,
      rename,
      renameField,
      false,
    ) as T['defaultValue'];
  }
  if (
    config.default?.literal &&
    (containsEnumValueNode(config.default.literal) ||
      config.default.literal.kind === Kind.OBJECT ||
      config.default.literal.kind === Kind.LIST)
  ) {
    next.default = {
      literal: rewriteEnumValueNode(
        config.default.literal,
        rename,
        renameField,
        inputType,
      ) as ConstValueNode,
    };
  } else if (config.default != null && config.default.value === null) {
    // Preserve explicit GraphQL 17 null — do not clear and fall back to defaultValue.
    next.default = { value: null };
  } else if (config.default?.value != null) {
    next.default = {
      value: rewriteJsDefaultForInputType(
        config.default.value,
        inputType,
        rename,
        renameField,
        true,
      ),
    };
  } else if (config.default != null) {
    next.default = undefined;
  }
  if (
    config.astNode?.defaultValue &&
    (containsEnumValueNode(config.astNode.defaultValue) ||
      config.astNode.defaultValue.kind === Kind.OBJECT ||
      config.astNode.defaultValue.kind === Kind.LIST)
  ) {
    next.astNode = {
      ...config.astNode,
      defaultValue: rewriteEnumValueNode(
        config.astNode.defaultValue,
        rename,
        renameField,
        inputType,
      ) as ConstValueNode,
    };
  }
  return next;
}

/** @deprecated Prefer {@link withRenamedEnumDefaults} for list-aware rewrites. */
export function withRenamedEnumDefault<T extends EnumDefaultConfig>(
  config: T,
  newDefault: string,
): T {
  return withRenamedEnumDefaults(config, () => newDefault);
}
