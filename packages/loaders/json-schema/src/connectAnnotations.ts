import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType,
  type GraphQLArgument,
  type GraphQLEnumType,
  type GraphQLInputType,
  type GraphQLNamedOutputType,
  type GraphQLOutputType,
  type GraphQLUnionType,
} from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import {
  formatEntityStubSelection,
  inferEntityRefFromParentFkNames,
} from '@graphql-mesh/fusion-composition';
import { ObjMapScalar } from '@graphql-mesh/transport-common';
import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import { getMeshEntityKeyFields, getMeshEntityRef, isMeshEntityType } from './entityRefs.js';
import type {
  ConnectSelectionOptions,
  ConnectSelectionOverLimit,
  JSONSchemaHTTPJSONOperationConfig,
  JSONSchemaOperationConfig,
} from './types.js';

export type { ConnectSelectionOptions, ConnectSelectionOverLimit };

export interface ResolvedConnectSelectionLimit {
  maxLength: number;
  softDepth: number;
  overLimit: ConnectSelectionOverLimit;
  /** Optional logger for Router/Hive policy warnings. */
  log?: Logger;
  /** Collect passthrough types; flushed once per schema load. */
  warnedPassthrough?: Set<string>;
  /**
   * Mutable visit counter for one root `buildSelectionForType` call.
   * Reset by the caller before each root build. Caps Stripe-scale blowups.
   */
  passthroughVisits?: number;
  /** Max type visits per root build before forcing `$` passthrough. */
  passthroughVisitBudget: number;
}

const DEFAULT_CONNECT_SELECTION_MAX_LENGTH = 12_000;
const DEFAULT_CONNECT_SELECTION_SOFT_DEPTH = 2;
/** Stop expanding after this many type visits (Hive `$` is fine; Router needs leavesOnly). */
const DEFAULT_PASSTHROUGH_VISIT_BUDGET = 250;

export const CONNECT_SELECTION_PASSTHROUGH_ROUTER_WARNING = `connect(selection: "$") was used because the response mapping could not be fully expanded under connectSelection limits. Hive Gateway will pass through the raw JSON. Apollo Router requires explicit scalar leaf mappings for object types — set connectSelection: { overLimit: "leavesOnly" } (and/or raise maxLength) or model foreign keys as entity stubs to run this subgraph on Router.`;

/**
 * Resolve programmatic `connectSelection` limit options with defaults.
 * `maxLength: 0` → no limit; `softDepth: -1` → no soft-depth leaves switch.
 * Default `overLimit` is `passthrough` (Hive-correct). Use `leavesOnly` for Router.
 */
export function resolveConnectSelectionLimit(
  input?: ConnectSelectionOptions | null,
  log?: Logger,
): ResolvedConnectSelectionLimit {
  const maxLength =
    input?.maxLength === 0
      ? Number.POSITIVE_INFINITY
      : (input?.maxLength ?? DEFAULT_CONNECT_SELECTION_MAX_LENGTH);
  const softDepth =
    input?.softDepth === -1
      ? Number.POSITIVE_INFINITY
      : (input?.softDepth ?? DEFAULT_CONNECT_SELECTION_SOFT_DEPTH);
  return {
    maxLength,
    softDepth,
    overLimit: input?.overLimit ?? 'passthrough',
    log,
    passthroughVisitBudget: DEFAULT_PASSTHROUGH_VISIT_BUDGET,
  };
}

/**
 * Record a type that fell back to `$` passthrough. Call
 * {@link flushConnectSelectionPassthroughWarnings} once per schema load.
 */
export function warnConnectSelectionPassthrough(
  limit: ResolvedConnectSelectionLimit,
  typeName: string,
): void {
  limit.warnedPassthrough ??= new Set();
  limit.warnedPassthrough.add(typeName);
}

const PASSTHROUGH_WARN_PREVIEW = 3;
const PASSTHROUGH_WARN_NAME_MAX = 80;

function formatPassthroughTypeName(typeName: string): string {
  if (typeName.length <= PASSTHROUGH_WARN_NAME_MAX) {
    return typeName;
  }
  return `${typeName.slice(0, PASSTHROUGH_WARN_NAME_MAX - 1)}…`;
}

/** Emit one aggregated passthrough warning for the schema (avoids Stripe-scale spam). */
export function flushConnectSelectionPassthroughWarnings(
  limit: ResolvedConnectSelectionLimit,
): void {
  const types = limit.warnedPassthrough;
  if (!limit.log || !types?.size) {
    return;
  }
  const names = [...types];
  const preview = names
    .slice(0, PASSTHROUGH_WARN_PREVIEW)
    .map(formatPassthroughTypeName)
    .join(', ');
  const overflow = names.length - PASSTHROUGH_WARN_PREVIEW;
  const more = overflow > 0 ? ` --- more --- (+${overflow})` : '';
  limit.log.warn(
    `${CONNECT_SELECTION_PASSTHROUGH_ROUTER_WARNING} (${names.length} type(s): ${preview}${more})`,
  );
  types.clear();
}

const JSONSelectionScalar = GraphQLString;
const URLPathTemplateScalar = GraphQLString;

export const HTTPHeaderMappingInput = new GraphQLInputObjectType({
  name: 'HTTPHeaderMapping',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    value: { type: GraphQLString },
    from: { type: GraphQLString },
  },
});

export const ConnectHTTPInput = new GraphQLInputObjectType({
  name: 'ConnectHTTP',
  fields: {
    GET: { type: URLPathTemplateScalar },
    HEAD: { type: URLPathTemplateScalar },
    POST: { type: URLPathTemplateScalar },
    PUT: { type: URLPathTemplateScalar },
    PATCH: { type: URLPathTemplateScalar },
    DELETE: { type: URLPathTemplateScalar },
    headers: { type: new GraphQLList(new GraphQLNonNull(HTTPHeaderMappingInput)) },
    body: { type: JSONSelectionScalar },
    queryParams: { type: JSONSelectionScalar },
  },
});

export const ConnectorErrorsInput = new GraphQLInputObjectType({
  name: 'ConnectorErrors',
  fields: {
    message: { type: JSONSelectionScalar },
    extensions: { type: JSONSelectionScalar },
  },
});

export const SourceHTTPInput = new GraphQLInputObjectType({
  name: 'SourceHTTP',
  fields: {
    baseURL: { type: new GraphQLNonNull(GraphQLString) },
    headers: { type: new GraphQLList(new GraphQLNonNull(HTTPHeaderMappingInput)) },
    queryParams: { type: JSONSelectionScalar },
    errors: { type: ConnectorErrorsInput },
    isSuccess: { type: JSONSelectionScalar },
  },
});

export const ConnectDirective = new GraphQLDirective({
  name: 'connect',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  args: {
    source: { type: GraphQLString },
    http: { type: ConnectHTTPInput },
    selection: { type: new GraphQLNonNull(JSONSelectionScalar) },
    entity: { type: GraphQLBoolean },
    errors: { type: ConnectorErrorsInput },
    isSuccess: { type: JSONSelectionScalar },
  },
  isRepeatable: true,
});

export const SourceDirective = new GraphQLDirective({
  name: 'source',
  locations: [DirectiveLocation.SCHEMA],
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    http: { type: new GraphQLNonNull(SourceHTTPInput) },
    errors: { type: ConnectorErrorsInput },
    isSuccess: { type: JSONSelectionScalar },
  },
  isRepeatable: true,
});

export const LinkDirective = new GraphQLDirective({
  name: 'link',
  locations: [DirectiveLocation.SCHEMA],
  args: {
    url: { type: new GraphQLNonNull(GraphQLString) },
    import: { type: new GraphQLList(GraphQLString) },
  },
  isRepeatable: true,
});

/**
 * Legacy Mesh-only field directive. Connectors bake QS into `http.queryParams`
 * (and form-urlencoded bodies via qs defaults); new schemas no longer emit this.
 * Kept for hydrating older SDLs that still carry `@meshRestOptions`.
 */
export const MeshRestOptionsDirective = new GraphQLDirective({
  name: 'meshRestOptions',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    queryStringOptions: { type: ObjMapScalar },
    queryStringOptionsByParam: { type: ObjMapScalar },
  },
});

/** @deprecated Mesh spec link was only needed for `@meshRestOptions`. */
export const MESH_SPEC_LINK_URL = 'https://the-guild.dev/graphql/mesh/spec/v1.0';

export const CONNECT_LINK_URL = 'https://specs.apollo.dev/connect/v0.4';

/**
 * Mesh path templates use `{args.foo}`; Connectors use `{$args.foo}`.
 */
export function toConnectPathTemplate(path: string | undefined | null): string {
  if (path == null) {
    return '';
  }
  return String(path)
    .replace(/\{args\./g, '{$args.')
    .replace(/\{root\./g, '{$this.')
    .replace(/\{this\./g, '{$this.')
    .replace(/\{env\./g, '{$env.')
    .replace(/\{context\./g, '{$context.');
}

/**
 * Read GraphQL-name → JSON-value remaps from `@enum` (or enum `.value` ≠ `.name`).
 * Used to emit Apollo `$args.x->match(...)` so Router remaps without Mesh `@enum`.
 */
export function getEnumNameToJsonRemap(enumType: GraphQLEnumType): Array<[string, unknown]> {
  const pairs: Array<[string, unknown]> = [];
  for (const ev of enumType.getValues()) {
    // Prefer getDirectiveExtensions (AST + extensions); fallback for partial configs.
    const fromDirs = getDirectiveExtensions(ev)?.enum?.[0]?.value;
    const fromExt = fromDirs ?? (ev.extensions as any)?.directives?.enum?.[0]?.value;
    const fromAst = ev.astNode?.directives
      ?.find(d => d.name.value === 'enum')
      ?.arguments?.find(a => a.name.value === 'value');
    let jsonValue: unknown = ev.value;
    if (typeof fromExt === 'string') {
      try {
        jsonValue = JSON.parse(fromExt);
      } catch {
        jsonValue = fromExt;
      }
    } else if (fromExt != null && typeof fromExt !== 'string') {
      jsonValue = fromExt;
    } else if (fromAst && 'value' in fromAst.value) {
      const raw = (fromAst.value as any).value;
      try {
        jsonValue = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        jsonValue = raw;
      }
    }
    if (jsonValue != null && String(jsonValue) !== ev.name) {
      pairs.push([ev.name, jsonValue]);
    }
  }
  return pairs;
}

/**
 * `$args.foo` → `$args.foo->match(["GQL", $("json")], …, [@, $args.foo])` when remapped.
 */
export function wrapArgExprWithEnumMatch(argExpr: string, enumType: GraphQLEnumType): string {
  const pairs = getEnumNameToJsonRemap(enumType);
  if (!pairs.length) {
    return argExpr;
  }
  // Use JSON literals (not `$()`) so path/header templates can eval `->match` after
  // global `$("…")` literal expansion in `resolveTemplate`.
  const arms = pairs
    .map(([gql, json]) => `[${JSON.stringify(gql)}, ${JSON.stringify(json)}]`)
    .join(', ');
  return `${argExpr}->match(${arms}, [@, ${argExpr}])`;
}

/**
 * Rewrite `{$args.x}` in a Connectors path when `x` is a remapped enum argument.
 */
export function rewriteConnectPathEnumArgs(
  path: string,
  args: ReadonlyArray<GraphQLArgument> | Record<string, { type: any; name?: string }> | undefined,
): string {
  if (!path || !args) {
    return path;
  }
  const argList = Array.isArray(args)
    ? args
    : Object.entries(args).map(([name, arg]) => ({ ...arg, name: arg.name || name }));
  let next = path;
  for (const arg of argList) {
    let t = arg.type;
    while (isNonNullType(t) || isListType(t)) {
      t = t.ofType;
    }
    if (!isEnumType(t)) continue;
    const pairs = getEnumNameToJsonRemap(t);
    if (!pairs.length) continue;
    const bare = `$args.${arg.name}`;
    const wrapped = wrapArgExprWithEnumMatch(bare, t);
    // {$args.x} → {$args.x->match(...)}
    next = next.replaceAll(`{${bare}}`, `{${wrapped}}`);
  }
  return next;
}

/**
 * Path to a JSON property in Connectors selection/mapping language.
 * Safe idents stay bare (`foo` / `$.foo`); reserved/hyphenated keys use
 * `$->get("…")` — Apollo Router's selection parser hits `Eof` on `$["…"]`.
 */
export function connectorsJsonKeyPath(jsonName: string, opts?: { rootDollar?: boolean }): string {
  if (/^[A-Za-z_][\w]*$/.test(jsonName)) {
    return opts?.rootDollar ? `$.${jsonName}` : jsonName;
  }
  return `$->get(${JSON.stringify(jsonName)})`;
}

export type DiscriminatorInfo = {
  field: string;
  /** JSON discriminator value → GraphQL concrete type name */
  mapping: [string, string][];
};

export function getDiscriminatorInfo(type: {
  getFields?: () => Record<string, unknown>;
  astNode?: { directives?: readonly any[] } | null;
  extensions?: unknown;
}): DiscriminatorInfo | null {
  const ext = ((type.extensions as any)?.directives?.discriminator || []) as Array<{
    field?: string;
    mapping?: [string, string][];
  }>;
  const fromExt = ext[0];
  const fromAst = type.astNode?.directives?.find((d: any) => d.name.value === 'discriminator');
  let field = fromExt?.field;
  let mapping = fromExt?.mapping;
  if (!field && fromAst) {
    for (const arg of fromAst.arguments || []) {
      if (arg.name.value === 'field' && arg.value.kind === 'StringValue') {
        field = arg.value.value;
      }
      if (arg.name.value === 'mapping' && arg.value.kind === 'ListValue') {
        mapping = arg.value.values
          .filter((v: any) => v.kind === 'ListValue' && v.values.length >= 2)
          .map((v: any) => [
            v.values[0].value ?? String(v.values[0]),
            v.values[1].value ?? String(v.values[1]),
          ]);
      }
    }
  }
  if (!field || !mapping?.length) {
    return null;
  }
  return { field, mapping };
}

/**
 * Property-discriminator match that yields GraphQL type *names* (string arms).
 * Used when embedding into `$status->match` defaults — not for abstract field selections.
 */
export function buildDiscriminatorStringMatchExpr(type: {
  getFields?: () => Record<string, unknown>;
  astNode?: { directives?: readonly any[] } | null;
  extensions?: unknown;
}): string {
  const info = getDiscriminatorInfo(type);
  if (!info) return '';
  const fieldPath = connectorsJsonKeyPath(info.field, { rootDollar: true });
  const arms = info.mapping
    .map(([json, typeName]) => `[${JSON.stringify(json)}, ${JSON.stringify(typeName)}]`)
    .join(', ');
  return `${fieldPath}->match(${arms})`;
}

/**
 * Federation Connectors v0.4 abstract-type spread:
 * `... $_type->match(["JSON", { __typename: "GqlType", exclusiveField }], …)`
 *
 * Router rejects `__typename: $._type->match([…, "Type"])` (non-literal Shape).
 * `exclusiveFieldsByType` maps GraphQL type name → selection fragment inside the branch object.
 */
export function buildDiscriminatorAbstractSpread(
  type: {
    getFields?: () => Record<string, unknown>;
    astNode?: { directives?: readonly any[] } | null;
    extensions?: unknown;
  },
  exclusiveFieldsByType: Record<string, string> = {},
): string {
  const info = getDiscriminatorInfo(type);
  if (!info) return '';
  const fieldPath = connectorsJsonKeyPath(info.field, { rootDollar: true });
  const arms = info.mapping
    .map(([json, typeName]) => {
      const exclusive = exclusiveFieldsByType[typeName]?.trim();
      const objectLit = exclusive
        ? `{ __typename: ${JSON.stringify(typeName)}, ${exclusive} }`
        : `{ __typename: ${JSON.stringify(typeName)} }`;
      return `[${JSON.stringify(json)}, ${objectLit}]`;
    })
    .join(', ');
  return `... ${fieldPath}->match(${arms})`;
}

/**
 * @deprecated Prefer {@link buildDiscriminatorAbstractSpread} for selections.
 * Kept as a thin wrapper that returns the abstract spread (Router-safe).
 */
export function buildDiscriminatorTypenameSelection(type: {
  getFields?: () => Record<string, unknown>;
  astNode?: { directives?: readonly any[] } | null;
  extensions?: unknown;
}): string {
  return buildDiscriminatorAbstractSpread(type);
}

/**
 * Convert Mesh/OpenAPI link parameter interpolations into Connectors path expressions.
 * Examples:
 * - `{root.$response.body#/employerId}` → `{$this.employerId}`
 * - `{root.$request.path.username}` → `{$this.username}`
 * - `acme` → `$("acme")`
 */
export function toConnectLinkExpression(interpolation: unknown): string {
  if (interpolation == null) {
    return '$("")';
  }
  if (typeof interpolation !== 'string') {
    return `$(${JSON.stringify(interpolation)})`;
  }
  const raw = interpolation.trim();
  if (!raw) {
    return '$("")';
  }
  if (!raw.includes('{') && !raw.startsWith('$')) {
    return `$(${JSON.stringify(raw)})`;
  }

  const toThisPath = (pointer: string) =>
    pointer
      .split('/')
      .filter(Boolean)
      .map(segment => sanitizeNameForGraphQL(segment))
      .join('.');

  // Response body fields are present on the parent object after @connect selection.
  const bodyPointer = raw.match(/^\{root\.\$response\.body(?:#\/|\.)(.+)\}$/);
  if (bodyPointer) {
    return `{$this.${toThisPath(bodyPointer[1])}}`;
  }
  // `$request.path|query` must read Mesh response metadata from the request that
  // produced the parent object (legacy OpenAPI-to-GraphQL link semantics), not `$this`.
  const requestPathOrQuery = raw.match(/^\{root\.\$request\.(path|query)\.(.+)\}$/);
  if (requestPathOrQuery) {
    const loc = requestPathOrQuery[1];
    const pointer = requestPathOrQuery[2];
    // Path args are GraphQL-sanitized on the parent request; query keys stay as in the URL.
    const key = loc === 'path' ? toThisPath(pointer) : pointer;
    return `{root.$request.${loc}.${key}}`;
  }
  // Global Mesh response/request interpolations used by scanner/link fixtures
  if (
    /\{root\.\$\w+/.test(raw) ||
    /\{root\.\$request\./.test(raw) ||
    /\{root\.\$response\./.test(raw)
  ) {
    return raw;
  }

  // HATEOAS / OpenAPI link args: `{root['id']}` / `{root["supplierId"]}` / `{root.id}`
  // → Apollo `{$this.id}` (parent object field after @connect selection).
  const rootBracket = raw.match(/^\{root\[['"]([^'"]+)['"]\]\}$/);
  if (rootBracket) {
    const field = sanitizeNameForGraphQL(rootBracket[1]);
    return `{$this.${field}}`;
  }
  const rootDot = raw.match(/^\{root\.([A-Za-z_][\w]*)\}$/);
  if (rootDot) {
    return `{$this.${rootDot[1]}}`;
  }

  // Fall back: normalize Mesh → Connectors, then rewrite leftover response body pointers.
  return toConnectPathTemplate(raw)
    .replace(/\{\$this\.\$response\.body#\/([^}]+)\}/g, (_, pointer: string) => {
      return `{$this.${toThisPath(pointer)}}`;
    })
    .replace(/\{\$this\.\$response\.body\.([^}]+)\}/g, (_, pointer: string) => {
      return `{$this.${toThisPath(pointer)}}`;
    })
    .replace(/\{root\[['"]([^'"]+)['"]\]\}/g, (_, key: string) => {
      return `{$this.${sanitizeNameForGraphQL(key)}}`;
    })
    .replace(/\{root\.([A-Za-z_][\w]*)\}/g, '{$this.$1}');
}

export function headersToConnectMappings(
  headers?: Record<string, string> | [string, string][],
): Array<{ name: string; value?: string; from?: string }> | undefined {
  if (!headers) {
    return undefined;
  }
  const entries = Array.isArray(headers) ? headers : Object.entries(headers);
  if (!entries.length) {
    return undefined;
  }
  return entries.map(([name, value]) => {
    const interpolated = toConnectPathTemplate(String(value));
    // `{context.headers.X}` style -> from: "X" when possible
    const fromMatch = interpolated.match(/^\{\$context\.headers\.(.+)\}$/);
    if (fromMatch) {
      return { name, from: fromMatch[1] };
    }
    return { name, value: interpolated };
  });
}

function collectObjectPropertyNames(
  schema:
    | { type?: string; properties?: Record<string, unknown>; anyOf?: any[]; oneOf?: any[] }
    | undefined,
  opts: { includeUnionBranches?: boolean } = { includeUnionBranches: true },
): string[] {
  if (!schema) return [];
  if (schema.properties && typeof schema.properties === 'object') {
    return Object.keys(schema.properties);
  }
  if (!opts.includeUnionBranches) {
    return [];
  }
  for (const branch of [...(schema.anyOf || []), ...(schema.oneOf || [])]) {
    const props = branch?.properties as Record<string, unknown> | undefined;
    if (props && typeof props === 'object') {
      return Object.keys(props);
    }
  }
  return [];
}

function formatQueryParamKey(queryParam: string): string {
  return /^[A-Za-z_][\w]*$/.test(queryParam) ? queryParam : JSON.stringify(queryParam);
}

/**
 * QS options that cannot be fully baked into `http.queryParams` and still need
 * runtime / `@meshRestOptions` — today: form+explode on `@oneOf` / open objects
 * (no direct `properties` to expand as sibling keys).
 */
export function remainingQueryStringOptionsByParam(
  queryStringOptionsByParam?: Record<
    string,
    { arrayFormat?: string; destructObject?: boolean; deepObject?: boolean }
  >,
  queryParamArgMap?: Record<string, string>,
  argTypeMap?: Record<
    string,
    { type?: string; properties?: Record<string, unknown>; anyOf?: any[]; oneOf?: any[] }
  >,
):
  | Record<string, { arrayFormat?: string; destructObject?: boolean; deepObject?: boolean }>
  | undefined {
  if (!queryStringOptionsByParam) {
    return undefined;
  }
  const remaining: Record<
    string,
    { arrayFormat?: string; destructObject?: boolean; deepObject?: boolean }
  > = {};
  for (const [queryParam, paramOpts] of Object.entries(queryStringOptionsByParam)) {
    // comma / deepObject / repeat are baked or match qs defaults.
    if (!(paramOpts?.destructObject && !paramOpts?.deepObject)) {
      continue;
    }
    const argName = queryParamArgMap?.[queryParam] || queryParam;
    const argSchema = argTypeMap?.[argName] || argTypeMap?.[queryParam];
    // OpenAPI sets destructObject on explode arrays too; runtime only flattens objects.
    if (argSchema?.type && argSchema.type !== 'object') {
      continue;
    }
    const directPropNames = collectObjectPropertyNames(argSchema, {
      includeUnionBranches: false,
    });
    if (!directPropNames.length) {
      remaining[queryParam] = paramOpts;
    }
  }
  return Object.keys(remaining).length ? remaining : undefined;
}

/**
 * Build Connectors `http.queryParams` mapping from Mesh queryParamArgMap.
 *
 * Bake OpenAPI/qs options into the mapping so `@meshRestOptions` is unnecessary:
 * - deepObject + known props → `filter[name]: $args.filter.name`
 * - form explode (destructObject, not deepObject) + known props → top-level keys
 * - allowDots + known props → `"param.prop": $args.param.prop`
 * - arrayFormat:comma → `->joinNotNull(",")`
 *
 * Remaining plain objects / arrays rely on connect runtime qs defaults
 * (`indices: false` → deepObject brackets + arrayFormat repeat).
 */
export function buildQueryParamsSelection(
  queryParamArgMap?: Record<string, string>,
  queryStringOptionsByParam?: Record<
    string,
    { arrayFormat?: string; destructObject?: boolean; deepObject?: boolean }
  >,
  argTypeMap?: Record<
    string,
    { type?: string; properties?: Record<string, unknown>; anyOf?: any[]; oneOf?: any[] }
  >,
  queryStringOptions?: { allowDots?: boolean },
): string | undefined {
  if (!queryParamArgMap || !Object.keys(queryParamArgMap).length) {
    return undefined;
  }
  // Object-literal form so keys like `foo:bar` stay intact (line `key: expr` cannot).
  const lines: string[] = [];
  for (const [queryParam, argName] of Object.entries(queryParamArgMap)) {
    const paramOpts = queryStringOptionsByParam?.[queryParam];
    const argSchema = argTypeMap?.[argName] || argTypeMap?.[queryParam];
    const argType = argSchema?.type;
    // deepObject / allowDots may read anyOf property lists (Stripe `created`).
    const propNames = collectObjectPropertyNames(argSchema);
    // form+explode must NOT read oneOf branches — GraphQL `@oneOf` wraps the
    // chosen variant (`$args.intent.User_Intent_Input`), so baking `idtype:
    // $args.intent.idtype` would be wrong; leave runtime destructObject.
    const directPropNames = collectObjectPropertyNames(argSchema, {
      includeUnionBranches: false,
    });

    // Loader-level allowDots → dotted keys on the URL (Typesense-style).
    if (queryStringOptions?.allowDots && propNames.length) {
      for (const prop of propNames) {
        const dottedKey = `${queryParam}.${prop}`;
        lines.push(`  ${formatQueryParamKey(dottedKey)}: $args.${argName}.${prop}`);
      }
      continue;
    }

    // OpenAPI deepObject with known properties → Apollo-friendly expanded keys.
    if (paramOpts?.deepObject && propNames.length) {
      for (const prop of propNames) {
        const deepKey = `${queryParam}[${prop}]`;
        lines.push(`  ${formatQueryParamKey(deepKey)}: $args.${argName}.${prop}`);
      }
      continue;
    }

    // OpenAPI form+explode on objects → sibling query keys (not `param[prop]`).
    if (paramOpts?.destructObject && !paramOpts?.deepObject && directPropNames.length) {
      for (const prop of directPropNames) {
        lines.push(`  ${formatQueryParamKey(prop)}: $args.${argName}.${prop}`);
      }
      continue;
    }

    const key = formatQueryParamKey(queryParam);
    let expr = `$args.${argName}`;
    // Federation Connectors: explode:false / form style arrays → comma-joined list
    if (paramOpts?.arrayFormat === 'comma' && argType === 'array') {
      expr = `$args.${argName}->joinNotNull(",")`;
    }
    lines.push(`  ${key}: ${expr}`);
  }
  // Newlines required: Hive `parseQueryParamsEntries` splits on `\n` (Apollo accepts both).
  return `{\n${lines.join('\n')}\n}`;
}

function unwrapType(type: GraphQLOutputType): GraphQLNamedOutputType {
  let t: GraphQLOutputType = type;
  while (isNonNullType(t) || isListType(t)) {
    t = t.ofType;
  }
  return t;
}

/**
 * Read `@statusCodeTypeName` mappings from a union (AST or extensions).
 */
export function getStatusCodeTypeNameMappings(
  unionType: GraphQLUnionType,
): Array<{ statusCode: string; typeName: string }> {
  const mappings: Array<{ statusCode: string; typeName: string }> = [];
  const fromExt = ((unionType.extensions as any)?.directives?.statusCodeTypeName || []) as Array<{
    statusCode?: string | number | Array<string | number>;
    typeName?: string;
  }>;
  for (const entry of fromExt) {
    if (entry?.typeName == null || entry.statusCode == null) continue;
    const codes = Array.isArray(entry.statusCode) ? entry.statusCode : [entry.statusCode];
    for (const code of codes) {
      mappings.push({ statusCode: String(code), typeName: entry.typeName });
    }
  }
  for (const directive of unionType.astNode?.directives || []) {
    if (directive.name.value !== 'statusCodeTypeName') continue;
    let statusCode: string | undefined;
    let typeName: string | undefined;
    for (const arg of directive.arguments || []) {
      if (arg.name.value === 'statusCode' && arg.value.kind === 'StringValue') {
        statusCode = arg.value.value;
      } else if (arg.name.value === 'statusCode' && arg.value.kind === 'IntValue') {
        statusCode = arg.value.value;
      } else if (arg.name.value === 'typeName' && arg.value.kind === 'StringValue') {
        typeName = arg.value.value;
      }
    }
    if (statusCode != null && typeName != null) {
      mappings.push({ statusCode, typeName });
    }
  }
  return mappings;
}

/**
 * Federation Connectors status-union helpers: `isSuccess` + `__typename` via `$status->match`.
 *
 * Concrete status→type arms use type names. Statuses that map to a discriminator
 * interface / abstract parent use that type's `@discriminator` `->match` expr as the
 * arm/default value so Router+Hive resolve without Mesh `@discriminator` at runtime.
 */
export function buildStatusUnionConnectExtras(
  unionType: GraphQLUnionType,
  schemaTypes?: Map<string, { astNode?: any; extensions?: any }>,
): {
  isSuccess: string;
  typenameSelection: string | null;
} | null {
  const mappings = getStatusCodeTypeNameMappings(unionType);
  if (!mappings.length) {
    return null;
  }
  const toMatchKey = (code: string) => {
    const asNum = Number(code);
    return Number.isFinite(asNum) && String(asNum) === code ? String(asNum) : JSON.stringify(code);
  };
  const memberNames = new Set(unionType.getTypes().map(t => t.name));
  const hasDefault = mappings.some(m => m.statusCode === 'default');
  const explicitMappings = mappings.filter(m => m.statusCode !== 'default');
  const resolveTypenameExpr = (typeName: string): string => {
    if (memberNames.has(typeName)) {
      return JSON.stringify(typeName);
    }
    // Abstract / discriminator parent — prefer property match over the interface name.
    const abstractType =
      schemaTypes?.get(typeName) ||
      unionType.getTypes().find(t => t.name === typeName) ||
      // Interface may not be a union member; look at implementations' interfaces via extensions.
      null;
    // Nested `$status->match` arms need a *string* typename expr, not an abstract spread.
    let disc = abstractType ? buildDiscriminatorStringMatchExpr(abstractType) : '';
    if (!disc) {
      for (const member of unionType.getTypes()) {
        const ifaces = (member as any).getInterfaces?.() || [];
        for (const iface of ifaces) {
          if (iface.name === typeName) {
            disc = buildDiscriminatorStringMatchExpr(iface);
            if (disc) break;
          }
        }
        if (disc) break;
      }
    }
    if (disc) {
      return disc;
    }
    return JSON.stringify(typeName);
  };
  const successArms = explicitMappings.map(m => `[${toMatchKey(m.statusCode)}, true]`).join(', ');
  const typenameArms = explicitMappings
    .map(m => `[${toMatchKey(m.statusCode)}, ${resolveTypenameExpr(m.typeName)}]`)
    .join(', ');
  const defaultMapping = mappings.find(m => m.statusCode === 'default');
  const defaultExpr = defaultMapping
    ? resolveTypenameExpr(defaultMapping.typeName)
    : explicitMappings.length
      ? // Prefer abstract/success mapping when mixed; else first concrete.
        resolveTypenameExpr(
          explicitMappings.find(m => !memberNames.has(m.typeName))?.typeName ||
            explicitMappings[0].typeName,
        )
      : 'null';
  // When every non-default arm is concrete and equals default, keep the simple form.
  const typenameSelection = typenameArms
    ? `__typename: $status->match(${typenameArms}, [@, ${defaultExpr}])`
    : defaultExpr !== 'null'
      ? `__typename: $status->match([@, ${defaultExpr}])`
      : null;
  return {
    isSuccess: `$status->match(${successArms ? `${successArms}, ` : ''}[@, ${hasDefault}])`,
    typenameSelection,
  };
}

/**
 * Build a Connectors selection that maps JSON fields with matching GraphQL names.
 * Skips fields that already have their own `@connect` (e.g. links).
 */
export function buildSelectionForType(
  type: GraphQLOutputType,
  options: {
    skipFields?: Set<string>;
    depth?: number;
    /** Implementing object types when `type` is an interface (exclusive fields). */
    implementations?: ReadonlyArray<GraphQLOutputType>;
    /**
     * When true, only emit scalar/enum leaves (no nested object braces).
     * Used past the soft depth cap so Router never sees bare object field names.
     */
    leavesOnly?: boolean;
    /** Resolved size/depth/over-limit rule (defaults applied if omitted). */
    limit?: ResolvedConnectSelectionLimit;
    /**
     * Types already being expanded on this path — breaks OpenAPI cycles
     * (`Volume` → `VolumeSource` → … → `Volume`) when softDepth is inactive.
     */
    visited?: ReadonlySet<string>;
  } = {},
): string {
  const limit = options.limit ?? resolveConnectSelectionLimit();
  const {
    skipFields = new Set(),
    depth = 0,
    implementations = [],
    leavesOnly = false,
    visited = new Set(),
  } = options;
  const childOpts = {
    skipFields,
    implementations,
    limit,
    visited,
  };
  // Soft depth only applies for `leavesOnly` overLimit (Router-oriented). With
  // default `passthrough`, expand until maxLength / visit budget then `$`.
  const named = unwrapType(type);
  if (
    !leavesOnly &&
    limit.overLimit === 'passthrough' &&
    (isObjectType(named) || isInterfaceType(named) || isUnionType(named))
  ) {
    limit.passthroughVisits = (limit.passthroughVisits ?? 0) + 1;
    if (limit.passthroughVisits > limit.passthroughVisitBudget) {
      warnConnectSelectionPassthrough(limit, named.name);
      return '';
    }
  }
  if (!leavesOnly && limit.overLimit === 'leavesOnly' && depth > limit.softDepth) {
    return buildSelectionForType(type, { ...childOpts, depth, leavesOnly: true });
  }
  if (
    visited.has(named.name) &&
    (isObjectType(named) || isInterfaceType(named) || isUnionType(named))
  ) {
    // Cyclic schema: omit this nest (parent skips empty object expansion).
    return '';
  }
  if (isScalarType(named) || named.name === 'Void') {
    return '';
  }
  const nextVisited = new Set(visited);
  nextVisited.add(named.name);
  const nestedOpts = { ...childOpts, visited: nextVisited };
  if (isUnionType(named)) {
    const members = named.getTypes();
    if (members.length === 1) {
      return buildSelectionForType(members[0], { ...nestedOpts, depth: depth + 1 });
    }
    // Status-code unions: emit `__typename: $status->match(...)` + flattened member fields.
    // Only walk members when status mappings exist — otherwise getFields() during emit can
    // finalize graphql-compose object types before pending link fields are attached.
    const statusExtras = buildStatusUnionConnectExtras(named);
    const discTypename = buildDiscriminatorTypenameSelection(named);
    if (!statusExtras && !discTypename) {
      // Non-status / non-discriminator unions: pass through (`$`) for Hive resolveType.
      return '';
    }
    // Merge by top-level field block (brace-aware). Line-by-line dedupe would
    // drop subsequent `}` closers and corrupt nested selections.
    const merged = new Map<string, string>();
    for (const member of members) {
      const part = buildSelectionForType(member, { ...nestedOpts, depth: depth + 1 });
      if (!part) continue;
      for (const [key, block] of extractTopLevelSelectionFields(part)) {
        if (!merged.has(key)) {
          merged.set(key, block);
        }
      }
    }
    const mergedSelection = [statusExtras?.typenameSelection || discTypename, ...merged.values()]
      .filter(Boolean)
      .join(' ');
    if (mergedSelection.length > limit.maxLength) {
      // Prefer `__typename` bake alone over `$` so status unions stay Connectors-native
      // after `@statusCodeTypeName` is stripped (no Mesh runtime fallback).
      if (limit.overLimit === 'passthrough') {
        warnConnectSelectionPassthrough(limit, named.name);
        return statusExtras?.typenameSelection || discTypename || '';
      }
      if (!leavesOnly) {
        const leafMerged = new Map<string, string>();
        for (const member of members) {
          const part = buildSelectionForType(member, {
            ...nestedOpts,
            depth: depth + 1,
            leavesOnly: true,
          });
          if (!part) continue;
          for (const [key, block] of extractTopLevelSelectionFields(part)) {
            if (!leafMerged.has(key)) leafMerged.set(key, block);
          }
        }
        const leafSelection = [
          statusExtras?.typenameSelection || discTypename,
          ...leafMerged.values(),
        ]
          .filter(Boolean)
          .join(' ');
        if (
          leafSelection &&
          leafSelection.length <= limit.maxLength &&
          leafSelection !== (statusExtras?.typenameSelection || discTypename || '')
        ) {
          return leafSelection;
        }
      }
      return statusExtras?.typenameSelection || discTypename || '';
    }
    return mergedSelection;
  }
  if (!isObjectType(named) && !isInterfaceType(named)) {
    return '';
  }
  const fields = { ...named.getFields() };
  // Interface + property discriminator: exclusive implementor fields go in the abstract
  // spread branches (Router requires literal `__typename` in each arm). Shared interface
  // fields stay outside the spread.
  const discInfo = isInterfaceType(named) ? getDiscriminatorInfo(named) : null;
  const exclusiveFieldsByType: Record<string, string> = {};
  const exclusiveFieldNames = new Set<string>();
  if (discInfo && isInterfaceType(named)) {
    for (const impl of implementations) {
      const implNamed = unwrapType(impl);
      if (!isObjectType(implNamed)) continue;
      const exclusiveLines: string[] = [];
      for (const rawImplFieldName of Object.keys(implNamed.getFields())) {
        const implFieldName = String(rawImplFieldName);
        if (named.getFields()[implFieldName] || skipFields.has(implFieldName)) continue;
        exclusiveFieldNames.add(implFieldName);
        const implField = implNamed.getFields()[implFieldName];
        const implExt = ((implField.extensions as any)?.directives || {}) as Record<
          string,
          Array<{ field?: string }> | undefined
        >;
        const rrf =
          implExt.resolveRootField?.[0]?.field ||
          implField.astNode?.directives
            ?.find(d => d.name.value === 'resolveRootField')
            ?.arguments?.find(a => a.name.value === 'field');
        let jsonName: string | undefined;
        if (typeof rrf === 'string') jsonName = rrf;
        else if (rrf && 'value' in rrf) {
          const v = (rrf as any).value;
          jsonName = v?.value ?? v;
        }
        const jsonPath =
          jsonName && jsonName !== implFieldName ? connectorsJsonKeyPath(jsonName) : implFieldName;
        exclusiveLines.push(
          jsonName && jsonName !== implFieldName ? `${implFieldName}: ${jsonPath}` : implFieldName,
        );
      }
      if (exclusiveLines.length) {
        exclusiveFieldsByType[implNamed.name] = exclusiveLines.join(' ');
      }
    }
  } else if (isInterfaceType(named)) {
    // No discriminator: keep legacy flatten of implementor-only fields into the selection.
    for (const impl of implementations) {
      const implNamed = unwrapType(impl);
      if (!isObjectType(implNamed)) continue;
      Object.assign(fields, implNamed.getFields());
    }
  }
  const lines: string[] = [];
  // Non-interface (or no disc) object types may still carry @discriminator — emit spread first.
  if (!discInfo) {
    const discTypename = buildDiscriminatorTypenameSelection(named);
    if (discTypename) {
      lines.push(discTypename);
    }
  }
  // Sibling GraphQL field names to exclude from `$->entries` (Mesh `@dictionary` semantics).
  const dictionaryExcludeKeys = Object.keys(fields)
    .map(String)
    .filter(n => !n.startsWith('__'));
  for (const rawFieldName of Object.keys(fields)) {
    const fieldName = String(rawFieldName);
    if (skipFields.has(fieldName) || fieldName.startsWith('__')) {
      continue;
    }
    if (exclusiveFieldNames.has(fieldName)) {
      continue;
    }
    const field = fields[fieldName];
    const directiveExt = ((field.extensions as any)?.directives || {}) as Record<
      string,
      Array<{ field?: string }> | undefined
    >;
    const fieldDirectives = (field.astNode?.directives || []).map(d => d.name.value);
    // Mesh `@dictionary` (additionalProperties) → Connectors `$->entries->filter(...)`.
    if (Boolean(directiveExt.dictionary?.length) || fieldDirectives.includes('dictionary')) {
      if (leavesOnly) {
        continue;
      }
      const filters = dictionaryExcludeKeys
        .map(k => `->filter(@.key->ne(${JSON.stringify(k)}))`)
        .join('');
      let valueSel = '';
      const entryType = unwrapType(field.type);
      if (isObjectType(entryType)) {
        const valueField = entryType.getFields().value;
        if (valueField) {
          valueSel = buildSelectionForType(valueField.type, {
            ...nestedOpts,
            depth: depth + 1,
          });
        }
      }
      const valuePart = valueSel ? ` value { ${valueSel} }` : ' value';
      lines.push(`${fieldName}: $->entries${filters} { key${valuePart} }`);
      continue;
    }
    const extDirectiveNames = Object.keys(directiveExt);
    if (fieldDirectives.includes('connect') || extDirectiveNames.includes('connect')) {
      continue;
    }
    // `@resolveRoot` → virtual `@connect(selection: "$")` on the field (finalize step).
    // Skip here so parent `$` passthrough keeps the scalar/object root intact.
    if (Boolean(directiveExt.resolveRoot?.length) || fieldDirectives.includes('resolveRoot')) {
      continue;
    }
    // Entity ref: OpenAPI/HATEOAS links (`meshEntityRef`) or inferred FK
    // (`supplierId` + resolvable `Supplier`) → stub instead of inlining the tree.
    // https://www.apollographql.com/docs/graphos/connectors/entities/across-subgraphs
    let entityRef =
      ((field.extensions as any)?.meshEntityRef as Record<string, string> | undefined) ||
      getMeshEntityRef(named.name, fieldName);
    if (!entityRef && isObjectType(named)) {
      for (const iface of named.getInterfaces()) {
        entityRef = getMeshEntityRef(iface.name, fieldName);
        if (entityRef) break;
      }
    }
    const fieldNamedEarly = unwrapType(field.type);
    if (
      !entityRef &&
      (isObjectType(fieldNamedEarly) || isInterfaceType(fieldNamedEarly)) &&
      isMeshEntityType(fieldNamedEarly.name)
    ) {
      const keyFields = getMeshEntityKeyFields(fieldNamedEarly.name) || ['id'];
      const parentNames = Object.keys(fields)
        .map(String)
        .filter(name => {
          const fkNamed = unwrapType(fields[name].type);
          return isScalarType(fkNamed) || isEnumType(fkNamed);
        });
      entityRef = inferEntityRefFromParentFkNames(parentNames, fieldName, keyFields);
    }
    if (entityRef && Object.keys(entityRef).length) {
      // Apollo entity references need a string-literal `__typename` plus key fields:
      // `supplier: { __typename: $("Supplier") id: supplierId }`
      lines.push(formatEntityStubSelection(fieldName, unwrapType(field.type).name, entityRef));
      continue;
    }
    // `@resolveRootField(field: "foo-bar")` → GraphQL `foo_bar` from JSON `foo-bar`
    const resolveRootField =
      directiveExt.resolveRootField?.[0]?.field ||
      field.astNode?.directives
        ?.find(d => d.name.value === 'resolveRootField')
        ?.arguments?.find(a => a.name.value === 'field');
    let jsonName: string | undefined;
    if (typeof resolveRootField === 'string') {
      jsonName = resolveRootField;
    } else if (resolveRootField && 'value' in resolveRootField) {
      const v = (resolveRootField as any).value;
      jsonName = v?.value ?? v;
    }
    // Federation Connectors: safe idents are bare paths; hyphenated/odd keys use `$->get("…")`
    // (Router's selection parser returns `nom::Eof` on `$["…"]`; a bare `"patent-id"` is a literal).
    const jsonPath =
      jsonName && jsonName !== fieldName ? connectorsJsonKeyPath(jsonName) : fieldName;
    const aliasPrefix =
      jsonName && jsonName !== fieldName ? `${fieldName}: ${jsonPath}` : fieldName;
    const fieldNamed = unwrapType(field.type);
    // Response enums: JSON value → GraphQL enum name via `->match` (Apollo has no `@enum`).
    if (isEnumType(fieldNamed)) {
      const pairs = getEnumNameToJsonRemap(fieldNamed);
      if (pairs.length) {
        // Keep JSON literal types (0 not "0") so `$x->match` compares correctly.
        const arms = pairs
          .map(([gql, json]) => `[${JSON.stringify(json)}, ${JSON.stringify(gql)}]`)
          .join(', ');
        lines.push(`${fieldName}: ${jsonPath}->match(${arms}, [@, ${jsonPath}])`);
        continue;
      }
    }
    const isObjectLike =
      isObjectType(fieldNamed) || isInterfaceType(fieldNamed) || isUnionType(fieldNamed);
    const isListLike =
      isListType(field.type) || (isNonNullType(field.type) && isListType(field.type.ofType));
    if (isObjectLike || isListLike) {
      // Past soft depth: still emit scalar/enum lists; omit object-like nests (Router rejects
      // bare object names without `{ … }` subselection).
      if (leavesOnly && isObjectLike) {
        continue;
      }
      const nested = buildSelectionForType(field.type, { ...nestedOpts, depth: depth + 1 });
      if (nested) {
        lines.push(`${aliasPrefix} { ${nested} }`);
      } else if (isObjectLike) {
        // Empty object/interface/union expansion (cycle / unresolved union): omit —
        // a bare object name is invalid Connectors selection on Router.
      } else {
        // List of scalars/enums — emit the field with no subselection.
        lines.push(aliasPrefix);
      }
    } else {
      lines.push(aliasPrefix);
    }
  }
  if (discInfo) {
    const spread = buildDiscriminatorAbstractSpread(named, exclusiveFieldsByType);
    if (spread) {
      lines.push(spread);
    }
  }
  // Spaces are enough for Connectors mapping (newlines are optional sugar).
  // Avoid `\n` escapes in printed SDL (`selection: "id name"` vs `"id\\nname"`).
  const joined = lines.join(' ');
  if (joined.length > limit.maxLength) {
    if (limit.overLimit === 'passthrough') {
      // Caller attaches `$` — Hive raw JSON; not Router-safe for object types.
      warnConnectSelectionPassthrough(limit, named.name);
      return '';
    }
    // leavesOnly: scalar/enum leaves under the cap when possible.
    // Use `visited` (not `nextVisited`) so this type can be re-entered for the rebuild.
    if (!leavesOnly) {
      return buildSelectionForType(type, {
        skipFields,
        implementations,
        limit,
        visited,
        depth,
        leavesOnly: true,
      });
    }
    return '';
  }
  return joined;
}

/**
 * Split a Connectors selection into top-level field blocks, preserving nested `{ … }`.
 */
function extractTopLevelSelectionFields(selection: string): Array<[string, string]> {
  const fields: Array<[string, string]> = [];
  const lines = selection.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed === '{' || trimmed === '}') {
      i++;
      continue;
    }
    const key = trimmed.split(/[\s:{]/)[0];
    let block = line;
    let depth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    i++;
    while (depth > 0 && i < lines.length) {
      block += '\n' + lines[i];
      depth += (lines[i].match(/{/g) || []).length - (lines[i].match(/}/g) || []).length;
      i++;
    }
    if (key) {
      fields.push([key, block]);
    }
  }
  return fields;
}

export function buildConnectHttpArgs(opts: {
  httpMethod: string;
  path: string;
  headers?: Record<string, string> | [string, string][];
  queryParamArgMap?: Record<string, string>;
  queryStringOptionsByParam?: Record<
    string,
    | { arrayFormat?: string; destructObject?: boolean; [key: string]: unknown }
    | Record<string, unknown>
  >;
  argTypeMap?: Record<string, { type?: string }>;
  queryStringOptions?: { allowDots?: boolean };
  bodySelection?: string;
}): Record<string, unknown> {
  const method = opts.httpMethod.toUpperCase();
  const http: Record<string, unknown> = {
    [method]: toConnectPathTemplate(opts.path),
  };
  const headers = headersToConnectMappings(opts.headers);
  if (headers) {
    http.headers = headers;
  }
  const queryParams = buildQueryParamsSelection(
    opts.queryParamArgMap,
    opts.queryStringOptionsByParam,
    opts.argTypeMap,
    opts.queryStringOptions,
  );
  if (queryParams) {
    http.queryParams = queryParams;
  }
  if (opts.bodySelection && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    http.body = opts.bodySelection;
  }
  return http;
}

/**
 * Infer `@connect(http.body:)` from Mesh operation request config.
 * When both `requestSchema`/`input` and `requestBaseBody` exist, bake base literals
 * into the body selection and spread `$args.input` so input overrides (Mesh merge).
 */
export function inferBodySelection(operationConfig: JSONSchemaOperationConfig): string | undefined {
  if (!('path' in operationConfig)) {
    return undefined;
  }
  const httpOp = operationConfig as JSONSchemaHTTPJSONOperationConfig;
  const method = (httpOp.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return undefined;
  }
  const hasInput =
    httpOp.requestTypeName || httpOp.requestSample != null || httpOp.requestSchema != null;
  const baseBody =
    httpOp.requestBaseBody != null &&
    typeof httpOp.requestBaseBody === 'object' &&
    !Array.isArray(httpOp.requestBaseBody)
      ? (httpOp.requestBaseBody as Record<string, unknown>)
      : null;
  if (hasInput && baseBody && Object.keys(baseBody).length) {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(baseBody)) {
      const keyOut = /^[A-Za-z_][\w]*$/.test(key) ? key : JSON.stringify(key);
      lines.push(`  ${keyOut}: $(${JSON.stringify(value)})`);
    }
    // Spread last so GraphQL `input` overrides fixed base keys (Mesh `{...base,...input}`).
    lines.push(`  ...$args.input`);
    return `{\n${lines.join('\n')}\n}`;
  }
  // Conventional Mesh/OpenAPI request arg is `input`; Connectors body maps from it.
  if (hasInput) {
    return `$args.input`;
  }
  if (httpOp.requestBaseBody != null) {
    return `$(${JSON.stringify(httpOp.requestBaseBody)})`;
  }
  return undefined;
}

/**
 * Walk an input type for `@resolveRootField` remaps and build an explicit Connectors
 * body subselection: `$args.input { "product-name": product_name plainField }`.
 * Returns undefined when no remaps exist (bare `$args.input` is enough).
 */
export function buildInputBodySelection(
  inputType: GraphQLInputType,
  depth = 0,
): string | undefined {
  if (depth > 4) return undefined;
  let t: GraphQLInputType = inputType;
  while (isNonNullType(t) || isListType(t)) {
    t = t.ofType as GraphQLInputType;
  }
  if (!isInputObjectType(t)) return undefined;
  const lines: string[] = [];
  let hasRemap = false;
  for (const field of Object.values(t.getFields())) {
    const dirs = getDirectiveExtensions(field);
    const rrf = dirs?.resolveRootField?.[0]?.field;
    const jsonName =
      typeof rrf === 'string'
        ? rrf
        : (field.extensions as any)?.directives?.resolveRootField?.[0]?.field;
    const nested = buildInputBodySelection(field.type, depth + 1);
    if (jsonName && jsonName !== field.name) {
      hasRemap = true;
      const lhs = /^[A-Za-z_][\w]*$/.test(jsonName) ? jsonName : JSON.stringify(jsonName);
      if (nested) {
        lines.push(`${lhs}: ${field.name} { ${nested} }`);
      } else {
        lines.push(`${lhs}: ${field.name}`);
      }
    } else if (nested) {
      hasRemap = true;
      lines.push(`${field.name} { ${nested} }`);
    } else {
      lines.push(field.name);
    }
  }
  if (!hasRemap) return undefined;
  return lines.join(' ');
}

/**
 * When a root `@connect(selection: "$")` returns an enum or `[Enum]` whose JSON
 * values differ from GraphQL names, bake `$->match` / `$->map(@->match)` so Mesh
 * `@enum` can be stripped from the SDL.
 */
export function bakeEnumRootSelection(selection: string, returnType: GraphQLOutputType): string {
  if (selection !== '$') return selection;
  let t: GraphQLOutputType = returnType;
  let isList = false;
  while (isNonNullType(t)) t = t.ofType;
  if (isListType(t)) {
    isList = true;
    t = t.ofType;
    while (isNonNullType(t)) t = t.ofType;
  }
  if (!isEnumType(t)) return selection;
  const pairs = getEnumNameToJsonRemap(t);
  if (!pairs.length) return selection;
  // JSON value → GraphQL enum name (response direction).
  const arms = pairs
    .map(([gql, json]) => `[${JSON.stringify(json)}, ${JSON.stringify(gql)}]`)
    .join(', ');
  if (isList) {
    return `$->map(@->match(${arms}, [@, @]))`;
  }
  return `$->match(${arms}, [@, $])`;
}

/**
 * Object-body entries for remapped `$args.input` fields (used when
 * `requestBaseBody` was baked as `{ …base, ...$args.input }`).
 * Example: `"product-name": $args.input.product_name`.
 */
function buildRemappedInputObjectEntries(
  inputType: GraphQLInputType,
  inputPath = '$args.input',
  depth = 0,
): string[] | undefined {
  if (depth > 4) return undefined;
  let t: GraphQLInputType = inputType;
  while (isNonNullType(t) || isListType(t)) {
    t = t.ofType as GraphQLInputType;
  }
  if (!isInputObjectType(t)) return undefined;
  const lines: string[] = [];
  let hasRemap = false;
  for (const field of Object.values(t.getFields())) {
    const dirs = getDirectiveExtensions(field);
    const rrf = dirs?.resolveRootField?.[0]?.field;
    const jsonName =
      typeof rrf === 'string'
        ? rrf
        : (field.extensions as any)?.directives?.resolveRootField?.[0]?.field;
    const nested = buildInputBodySelection(field.type, depth + 1);
    const valuePath = `${inputPath}.${field.name}`;
    if (jsonName && jsonName !== field.name) {
      hasRemap = true;
      const lhs = /^[A-Za-z_][\w]*$/.test(jsonName) ? jsonName : JSON.stringify(jsonName);
      if (nested) {
        lines.push(`${lhs}: ${valuePath} { ${nested} }`);
      } else {
        lines.push(`${lhs}: ${valuePath}`);
      }
    } else if (nested) {
      hasRemap = true;
      lines.push(`${field.name}: ${valuePath} { ${nested} }`);
    } else {
      lines.push(`${field.name}: ${valuePath}`);
    }
  }
  if (!hasRemap) return undefined;
  return lines;
}

/**
 * Rewrite `$args.input` body to include baked `@resolveRootField` key remaps.
 * Also expands `...$args.input` inside requestBaseBody object selections so
 * remapped JSON names are not lost when a base body is present.
 */
export function bakeInputBodySelection(
  body: string | undefined,
  args: Record<string, { type: GraphQLInputType }> | ReadonlyArray<GraphQLArgument> | undefined,
): string | undefined {
  if (!body || !args) return body;
  const trimmed = body.trim();
  const argList = Array.isArray(args)
    ? args
    : Object.entries(args).map(([name, arg]) => ({ ...arg, name }));
  const inputArg = argList.find(a => a.name === 'input');
  if (!inputArg) return body;

  // `{ base… ...$args.input }` from inferBodySelection — expand remapped input fields.
  if (trimmed.includes('...$args.input')) {
    const entries = buildRemappedInputObjectEntries(inputArg.type);
    if (!entries?.length) return body;
    return trimmed.replace(/\.\.\.\$args\.input\b/, entries.join('\n  '));
  }

  if (trimmed !== '$args.input' && !trimmed.startsWith('$args.input {')) {
    return body;
  }
  // Already has an explicit subselection — leave it.
  if (trimmed.includes('{')) return body;
  const sub = buildInputBodySelection(inputArg.type);
  if (!sub) return body;
  return `$args.input { ${sub} }`;
}

export function buildSourceDirectiveArgs(opts: {
  name: string;
  endpoint: string;
  headers?: Record<string, string> | [string, string][];
  queryParams?: Record<string, string | number | boolean>;
}): { name: string; http: Record<string, unknown> } {
  const http: Record<string, unknown> = {
    baseURL: toConnectPathTemplate(opts.endpoint),
  };
  const headers = headersToConnectMappings(opts.headers);
  if (headers) {
    http.headers = headers;
  }
  if (opts.queryParams && Object.keys(opts.queryParams).length) {
    http.queryParams = Object.entries(opts.queryParams)
      .map(([key, value]) => {
        const raw = String(value);
        // `{args.apiKey}` → `$args.apiKey`; constants use `$()` literals
        const normalized = /[{$]/.test(raw)
          ? toConnectPathTemplate(raw).replace(/^\{(.*)\}$/, '$1')
          : `$(${JSON.stringify(value)})`;
        return `${key}: ${normalized}`;
      })
      .join('\n');
  }
  return {
    name: opts.name,
    http,
  };
}
