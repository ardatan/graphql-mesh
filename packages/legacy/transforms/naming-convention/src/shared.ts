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
import { Kind, type GraphQLArgumentConfig, type ValueNode } from 'graphql';
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

/**
 * GraphQL 16 stores enum arg defaults on `defaultValue` (string).
 * GraphQL 17 often leaves `defaultValue` unset and keeps `default.literal` /
 * `default.value` / AST instead.
 *
 * An explicit `defaultValue: null` (or a present `default` object without a
 * usable enum string) must not fall back to a stale AST default.
 */
export function getEnumDefaultName(
  config: Pick<GraphQLArgumentConfig, 'defaultValue' | 'astNode'> & {
    default?: { literal?: ValueNode; value?: unknown };
  },
): string | undefined {
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
  // Authoritative `default` present but not a renameable enum string — no AST fallback.
  if (config.default != null) {
    return undefined;
  }
  const literal = config.astNode?.defaultValue;
  if (literal?.kind === Kind.ENUM) {
    return literal.value;
  }
  return undefined;
}

/** Write a renamed enum default for both GraphQL 16 (`defaultValue`) and 17 (`default`). */
export function withRenamedEnumDefault<
  T extends Pick<GraphQLArgumentConfig, 'defaultValue' | 'astNode'> & {
    default?: { literal?: ValueNode; value?: unknown };
  },
>(config: T, newDefault: string): T {
  const next: T = {
    ...config,
    defaultValue: newDefault,
  };
  if (config.default?.literal?.kind === Kind.ENUM) {
    // Literal-only rewrite: carrying a string `value` makes printSchema emit
    // `"NEWBIE"` instead of the enum `NEWBIE`.
    next.default = {
      literal: {
        ...config.default.literal,
        value: newDefault,
      },
    };
  } else if (typeof config.default?.value === 'string') {
    next.default = {
      ...config.default,
      value: newDefault,
    };
  } else if (config.default != null) {
    // Drop uncoerced default so `defaultValue` wins when the schema is rebuilt.
    next.default = undefined;
  }
  if (config.astNode?.defaultValue?.kind === Kind.ENUM) {
    next.astNode = {
      ...config.astNode,
      defaultValue: {
        ...config.astNode.defaultValue,
        value: newDefault,
      },
    };
  }
  return next;
}
