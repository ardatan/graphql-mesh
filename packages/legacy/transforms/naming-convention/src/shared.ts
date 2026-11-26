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

function rewriteEnumValueNode(node: ValueNode, rename: NamingConventionFn): ValueNode {
  if (node.kind === Kind.ENUM) {
    return { ...node, value: rename(node.value) };
  }
  if (node.kind === Kind.LIST) {
    return {
      ...node,
      values: node.values.map(v => rewriteEnumValueNode(v, rename)),
    };
  }
  if (node.kind === Kind.OBJECT) {
    return {
      ...node,
      fields: node.fields.map(f => ({
        ...f,
        value: rewriteEnumValueNode(f.value, rename),
      })),
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
  rename: NamingConventionFn,
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
    return value.map(item => rewriteJsDefaultForInputType(item, ofType, rename));
  }
  const named = getNamedType(type);
  if (isEnumType(named)) {
    return typeof value === 'string' ? rename(value) : value;
  }
  if (isInputObjectType(named) && value && typeof value === 'object' && !Array.isArray(value)) {
    const fields = (named as GraphQLInputObjectType).getFields();
    const out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const [fieldName, field] of Object.entries(fields)) {
      if (!(fieldName in out)) {
        continue;
      }
      out[fieldName] = rewriteJsDefaultForInputType(out[fieldName], field.type, rename);
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

/**
 * Like {@link hasRewritableEnumDefault}, but for input-object args
 * (`Filter = { status: newbie }`) uses the GraphQL input type to decide.
 */
export function hasRewritableEnumDefaultForType(
  config: EnumDefaultConfig,
  inputType: GraphQLInputType,
): boolean {
  const named = getNamedType(inputType);
  if (isEnumType(named)) {
    return hasRewritableEnumDefault(config);
  }
  if (!isInputObjectType(named)) {
    return false;
  }
  return hasRewritableEnumDefault(config);
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
): T {
  const named = getNamedType(inputType);
  if (isEnumType(named)) {
    return withRenamedEnumDefaults(config, rename);
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
    ) as T['defaultValue'];
  }
  if (config.default?.literal && containsEnumValueNode(config.default.literal)) {
    next.default = {
      literal: rewriteEnumValueNode(config.default.literal, rename) as ConstValueNode,
    };
  } else if (config.default?.value != null) {
    next.default = {
      value: rewriteJsDefaultForInputType(config.default.value, inputType, rename),
    };
  } else if (config.default != null) {
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

/** @deprecated Prefer {@link withRenamedEnumDefaults} for list-aware rewrites. */
export function withRenamedEnumDefault<T extends EnumDefaultConfig>(
  config: T,
  newDefault: string,
): T {
  return withRenamedEnumDefaults(config, () => newDefault);
}
