import {
  getNamedType,
  GraphQLError,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLUnionType,
  isEnumType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  type GraphQLField,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
} from 'graphql';
import type { IStringifyOptions } from 'qs';
import { stringify as qsStringify } from 'qs';
import urlJoin from 'url-join';
import { entitiesResolver } from '@apollo/subgraph';
import { Logger, type Logger as HiveLogger } from '@graphql-hive/logger';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { MeshFetch, MeshFetchRequestInit } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { getDirectiveExtensions, memoize1 } from '@graphql-tools/utils';
import { Blob, fetch as defaultFetch, File, FormData } from '@whatwg-node/fetch';
import { fakePromise } from '@whatwg-node/promise-helpers';
import { isFileUpload } from './isFileUpload.js';
import { createODataBatchFetch, type ODataBatchMode } from './odataBatch.js';
import {
  appendODataSelectExpand,
  attachExpandedNavFromRaw,
  hasODataMetadataAcceptHeader,
  isODataMetadataAccept,
} from './odataConnectProfile.js';
import { rebuildOpenInputObjects } from './odataOpenInput.js';
import { resolveDataByUnionInputType } from './resolveDataByUnionInputType.js';
import { serializeArgumentsForInterpolation } from './utils.js';
import {
  coerceXmlLeafForGraphQLType,
  isXmlContentType,
  jsObjectToXml,
  looksLikeXml,
  unwrapXmlScalarLeaf,
  xmlToJsObject,
} from './xmlCodec.js';

type ResolveReferenceFn = (reference: any, context: any, info: GraphQLResolveInfo) => any;

/**
 * Record `__resolveReference` the way `@apollo/subgraph` expects
 * (`extensions.apollo.subgraph.resolveReference`) so we can reuse
 * `entitiesResolver` instead of maintaining our own `_entities` dispatch.
 * Also mirror on `type.resolveReference` for Hive stub hydration helpers / tests.
 */
function setTypeResolveReference(type: GraphQLNamedType, resolveReference: ResolveReferenceFn) {
  const extensions = (type.extensions ??= {}) as Record<string, any>;
  const apollo = (extensions.apollo ??= {});
  const subgraph = (apollo.subgraph ??= {});
  subgraph.resolveReference = resolveReference;
  (type as any).resolveReference = resolveReference;
}

function getTypeResolveReference(type: GraphQLNamedType): ResolveReferenceFn | undefined {
  const fromExtensions = (type.extensions as any)?.apollo?.subgraph?.resolveReference;
  if (typeof fromExtensions === 'function') {
    return fromExtensions;
  }
  const fromType = (type as any).resolveReference;
  return typeof fromType === 'function' ? fromType : undefined;
}

const isListTypeOrNonNullListType = memoize1(function isListTypeOrNonNullListType(
  type: GraphQLOutputType,
) {
  if (isNonNullType(type)) {
    return isListType(type.ofType);
  }
  return isListType(type);
});

type ConnectHttp = {
  GET?: string;
  HEAD?: string;
  POST?: string;
  PUT?: string;
  PATCH?: string;
  DELETE?: string;
  headers?: Array<{ name: string; value?: string; from?: string }>;
  body?: string;
  queryParams?: string;
};

type ConnectorErrors = {
  message?: string;
  extensions?: string;
};

type ConnectArgs = {
  source?: string;
  http?: ConnectHttp;
  selection?: string;
  entity?: boolean;
  errors?: ConnectorErrors;
  isSuccess?: string;
};

type SourceArgs = {
  name: string;
  http: {
    baseURL: string;
    headers?: Array<{ name: string; value?: string; from?: string }>;
    queryParams?: string;
    errors?: ConnectorErrors;
    isSuccess?: string;
  };
  errors?: ConnectorErrors;
  isSuccess?: string;
};

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

type JoinDirectiveArgs = {
  graphs?: string[];
  name?: string;
  args?: Record<string, unknown>;
};

/**
 * Mesh compose emits Apollo Router-shaped `@join__directive(name: "connect"|"source")`
 * on the supergraph. Hive Gateway reads those the same way as raw `@connect` / `@source`.
 */
function getJoinDirectivePayloads(
  extensions: Record<string, unknown> | undefined,
  directiveName: 'connect' | 'source',
): Record<string, unknown>[] {
  const joins = extensions?.join__directive as JoinDirectiveArgs[] | undefined;
  if (!joins?.length) {
    return [];
  }
  const out: Record<string, unknown>[] = [];
  for (const join of joins) {
    if (join?.name === directiveName && join.args && typeof join.args === 'object') {
      out.push(join.args as Record<string, unknown>);
    }
  }
  return out;
}

function getSourceMap(schema: GraphQLSchema): Map<string, SourceArgs> {
  const schemaExt = getDirectiveExtensions(schema);
  const sources = [
    ...((schemaExt?.source as SourceArgs[] | undefined) || []),
    ...(getJoinDirectivePayloads(schemaExt as Record<string, unknown>, 'source') as SourceArgs[]),
  ];
  const map = new Map<string, SourceArgs>();
  for (const source of sources || []) {
    if (source?.name) {
      map.set(source.name, source);
    }
  }
  return map;
}

export function getConnectArgsFromNode(node: {
  name?: string;
  astNode?: unknown;
  extensions?: unknown;
}): ConnectArgs[] {
  const ext = getDirectiveExtensions(node as any);
  const raw = (ext?.connect as ConnectArgs[] | undefined) || [];
  const fromJoin = getJoinDirectivePayloads(
    ext as Record<string, unknown>,
    'connect',
  ) as ConnectArgs[];
  return [...raw, ...fromJoin];
}

/**
 * Resolve a Connectors / Mesh `{…}` template.
 *
 * When `encodeValues` is set (path / in-URL query templates), each replaced
 * expression value is percent-encoded — Apollo URLPathTemplate semantics — so
 * values like `1?admin=true` cannot break out of a path segment. Leave
 * `encodeValues` off for `@source` baseURL (host/port) and header values.
 */
function shouldSkipPathEncode(path: string, skipEncode?: (path: string) => boolean): boolean {
  if (skipEncode?.(path)) {
    return true;
  }
  // `_odataId` holds a full URL / entity id path — must not be percent-encoded.
  return /^(this|root)\._odataId\b/.test(path) || /^(this|root)\[['"]_odataId['"]\]/.test(path);
}

function resolveTemplate(
  template: string,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
    config?: Record<string, any>;
  },
  options: { encodeValues?: boolean; skipEncode?: (path: string) => boolean } = {},
): string {
  if (!template) {
    return '';
  }
  // Expand Connectors literals: $("Charles"), $(true), $(42)
  let resolved = template.replace(/\$\(\s*(["'])(.*?)\1\s*\)/g, (_, _q, value: string) => value);
  resolved = resolved.replace(
    /\$\(\s*(true|false|null|-?\d+(?:\.\d+)?)\s*\)/g,
    (_, value: string) => value,
  );
  // `{$args.x->match(...)}` / `{$this["a.b"]}` — evaluate as Connectors exprs (Apollo parity).
  // Mesh `:default` after a path (e.g. `{$context.headers['x-port']:4001}`) is not Connectors
  // syntax; strip it for eval and apply when the looked-up value is empty.
  resolved = resolved.replace(/\{\$([^{}]+)\}/g, (full, expr: string) => {
    const { path: exprPath, defaultValue } = splitMeshTemplateDefault(expr);
    if (!exprPath.includes('->') && !exprPath.includes('[')) {
      return full;
    }
    const value = evalConnectorsVarExpr(`$${exprPath}`, vars);
    if (value == null || value === '') {
      if (defaultValue != null) {
        if (!options.encodeValues || shouldSkipPathEncode(exprPath, options.skipEncode)) {
          return defaultValue;
        }
        return encodeURIComponent(defaultValue);
      }
      return '';
    }
    if (!options.encodeValues || shouldSkipPathEncode(exprPath, options.skipEncode)) {
      return String(value);
    }
    return encodeURIComponent(String(value));
  });
  // Normalize remaining Connectors `{$args.x|base64}` / `{$context.headers['x-port']:4001}` to Mesh
  // `{args.x|base64}` / `{context.headers['x-port']:4001}` so stringInterpolator modifiers work.
  // Use `[^{}]+` (not `\w` only) so bracket accessors and `:default` values are preserved.
  const meshForm = resolved.replace(/\{\$([^{}]+)\}/g, (_, path: string) => {
    const normalized = path.replace(/^root\b/, 'this');
    return `{${normalized}}`;
  });
  const interpolateArgs = {
    args: vars.args,
    context: vars.context,
    env: vars.env,
    root: vars.thisValue,
    this: vars.thisValue,
    config: vars.config,
  };
  if (!options.encodeValues) {
    const interpolated = stringInterpolator.parse(meshForm, interpolateArgs);
    return interpolated == null ? '' : String(interpolated);
  }
  // Encode each `{expr}` replacement individually (not the whole URL).
  // Absolute `@odata.id` follow-ups keep `_odataId` as a raw URL segment; other
  // interpolations in the same template (e.g. `{$args.id}`) stay percent-encoded.
  return meshForm.replace(/\{([^{}]+)\}/g, (_match, path: string) => {
    const value = stringInterpolator.parse(`{${path}}`, interpolateArgs);
    if (value == null || value === '') {
      return '';
    }
    return shouldSkipPathEncode(path, options.skipEncode)
      ? String(value)
      : encodeURIComponent(String(value));
  });
}

/**
 * Split Mesh `{path:default}` suffix from a Connectors `{$…}` body.
 * Uses the first top-level `:` so defaults like `https://example.com:8443` keep their colons.
 * Does not treat `->method(...)` colons inside args as defaults.
 */
function splitMeshTemplateDefault(expr: string): { path: string; defaultValue?: string } {
  if (expr.includes('->')) {
    return { path: expr };
  }
  let depth = 0;
  let inQuote: string | null = null;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (inQuote) {
      if (c === '\\' && i + 1 < expr.length) {
        i++;
        continue;
      }
      if (c === inQuote) inQuote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inQuote = c;
      continue;
    }
    if (c === '[' || c === '(') {
      depth++;
      continue;
    }
    if (c === ']' || c === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (c === ':' && depth === 0) {
      return {
        path: expr.slice(0, i),
        defaultValue: expr.slice(i + 1),
      };
    }
  }
  return { path: expr };
}

function evalConnectorsVarExpr(
  expr: string,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
    config?: Record<string, any>;
    batch?: Record<string, any>;
  },
): any {
  const trimmed = expr.trim();
  if (trimmed.startsWith('$(') && trimmed.endsWith(')')) {
    try {
      return JSON.parse(trimmed.slice(2, -1));
    } catch {
      return trimmed.slice(2, -1);
    }
  }
  const methodMatch = trimmed.match(/^(.*?)->([A-Za-z_][\w]*)\((.*)\)$/);
  if (methodMatch) {
    const left = evalConnectorsVarExpr(methodMatch[1].trim(), vars);
    const method = methodMatch[2];
    const rawArgs = methodMatch[3].trim();
    if (method === 'match') {
      // Prefer `$args`/`$this` lookup for match-arm values (e.g. `[@, $args.agent]`).
      // Do not use `thisValue || args` — an empty `{}` thisValue is truthy and hides args.
      return evalMatchMethod(left, rawArgs, vars.thisValue ?? {}, {}, vars);
    }
    if (method === 'get') {
      return evalGetMethod(left, rawArgs);
    }
    if (method === 'joinNotNull') {
      if (!Array.isArray(left)) return left;
      const sepMatch = rawArgs.match(/^["'](.*)["']$/);
      const sep = sepMatch ? sepMatch[1] : ',';
      return left.filter(v => v != null).join(sep);
    }
    if (method === 'jsonStringify') {
      return JSON.stringify(left);
    }
    if (method === 'toString') {
      return left == null ? '' : String(left);
    }
  }
  if (trimmed.startsWith('$')) {
    return lookupVar(trimmed, vars);
  }
  return trimmed;
}

function lookupVar(
  path: string,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
    config?: Record<string, any>;
    batch?: Record<string, any>;
  },
): any {
  const rootMatch = path.match(/^(\$[A-Za-z_][\w]*)([\s\S]*)$/);
  if (!rootMatch) {
    return undefined;
  }
  const root = rootMatch[1];
  let cur: any;
  switch (root) {
    case '$args':
      cur = vars.args;
      break;
    case '$this':
      cur = vars.thisValue;
      break;
    case '$batch':
      // Entity batch keys (Apollo `$batch.id`) — prefer explicit batch, else parent/root.
      cur = vars.batch ?? vars.thisValue;
      break;
    case '$env':
      cur = vars.env;
      break;
    case '$context':
      cur = vars.context;
      break;
    case '$config':
      cur = vars.config || {};
      break;
    default:
      return undefined;
  }
  for (const segment of tokenizeVarPath(rootMatch[2])) {
    if (cur == null) return undefined;
    cur = cur[segment];
  }
  return cur;
}

/** `.foo`, `["a.b"]`, `['x']` path segments after `$args` / `$this`. */
function tokenizeVarPath(rest: string): string[] {
  const segments: string[] = [];
  let i = 0;
  while (i < rest.length) {
    if (rest[i] === '.') {
      i++;
      let ident = '';
      while (i < rest.length && /[A-Za-z0-9_]/.test(rest[i])) {
        ident += rest[i];
        i++;
      }
      if (ident) segments.push(ident);
      continue;
    }
    if (rest[i] === '[') {
      i++;
      const quote = rest[i] === '"' || rest[i] === "'" ? rest[i] : null;
      if (quote) {
        i++;
        let key = '';
        while (i < rest.length && rest[i] !== quote) {
          if (rest[i] === '\\' && i + 1 < rest.length) {
            key += rest[i + 1];
            i += 2;
            continue;
          }
          key += rest[i];
          i++;
        }
        if (rest[i] === quote) i++;
        if (rest[i] === ']') i++;
        segments.push(key);
      } else {
        let key = '';
        while (i < rest.length && rest[i] !== ']') {
          key += rest[i];
          i++;
        }
        if (rest[i] === ']') i++;
        segments.push(key);
      }
      continue;
    }
    break;
  }
  return segments;
}

type MeshQsOptions = IStringifyOptions & { jsonStringify?: boolean };

/**
 * Connectors qs defaults match OpenAPI explode / deepObject:
 * - `indices: false` → arrays as `a=1&a=2` (repeat-style)
 * - plain objects → `a[b]=1` (deepObject brackets) unless `allowDots`
 * Form-urlencoded bodies reuse the same defaults.
 * Do not set `arrayFormat` here — it would override loader `indices: true`.
 */
const defaultQsOptions: IStringifyOptions = {
  indices: false,
};

/**
 * Minimal queryParams mapping.
 * Supports:
 * - object literal: `{ "foo:bar": $args.foo_bar, limit: $args.limit }`
 * - line form: `limit: $args.limit`
 * Null values are omitted. Array/object encoding follows Hive qs options.
 *
 * OpenAPI styles (deepObject / form explode / comma) are baked into
 * `queryParams` at emit time — no per-param runtime options.
 */
function applyQueryParams(
  fullPath: string,
  queryParamsSelection: string | undefined,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
  },
  qsOptions: MeshQsOptions = {},
  resolveArg?: (argName: string, value: any) => any,
): string {
  if (!queryParamsSelection) {
    return fullPath;
  }
  const entries = parseQueryParamsEntries(queryParamsSelection);
  const params: Record<string, any> = {};
  for (const [key, expr] of entries) {
    let value = evalQueryParamExpr(expr, vars);
    if (value == null) continue;
    // Recover oneOf / sanitized input shapes before serializing
    const argNameMatch = expr.match(/\$args\.(\w+)/);
    if (argNameMatch && resolveArg) {
      value = resolveArg(argNameMatch[1], value);
    }
    // OData parameter aliases (`@colors`, `@address`) must be one JSON value —
    // default qs repeat-style would emit `@colors=red&@colors=blue`.
    if (key.startsWith('@') && value != null && typeof value === 'object') {
      value = JSON.stringify(value);
    }
    params[key] = value;
  }
  if (!Object.keys(params).length) {
    return fullPath;
  }
  const { jsonStringify: globalJsonStringify, ...restQs } = qsOptions;
  if (globalJsonStringify) {
    for (const key of Object.keys(params)) {
      const value = params[key];
      if (value != null && typeof value === 'object') {
        params[key] = JSON.stringify(value);
      }
    }
  }
  // Keys already baked with a `[]` suffix (per-param arrayFormat:brackets) must
  // stringify as repeat without indices — otherwise global `arrayFormat:'brackets'`
  // / `indices:true` produce `ids[][]` or `ids[][0]`.
  const preBracketed: Record<string, any> = {};
  const regular: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.endsWith('[]')) {
      preBracketed[key] = value;
    } else {
      regular[key] = value;
    }
  }
  const parts: string[] = [];
  if (Object.keys(regular).length) {
    parts.push(
      qsStringify(regular, {
        ...defaultQsOptions,
        ...restQs,
      }),
    );
  }
  if (Object.keys(preBracketed).length) {
    parts.push(
      qsStringify(preBracketed, {
        ...defaultQsOptions,
        ...restQs,
        // Override only array encoding so baked `[]` keys are not doubled.
        indices: false,
        arrayFormat: 'repeat',
      }),
    );
  }
  const serialized = parts.filter(Boolean).join('&');
  if (!serialized) {
    return fullPath;
  }
  // Field-level queryParams override source/global keys (Mesh httpOperation semantics).
  const abs = /^https?:\/\//i.test(fullPath);
  const url = abs ? new URL(fullPath) : new URL(fullPath, 'http://mesh.local/');
  for (const key of Object.keys(params)) {
    url.searchParams.delete(key);
  }
  const existing = url.search.startsWith('?') ? url.search.slice(1) : url.search;
  url.search = existing ? `?${existing}&${serialized}` : `?${serialized}`;
  if (abs) {
    return url.toString();
  }
  // Preserve relative paths (no forced leading slash) for Mesh test mocks.
  const leadingSlash = fullPath.startsWith('/');
  let pathPart = url.pathname;
  if (!leadingSlash && pathPart.startsWith('/')) {
    pathPart = pathPart.slice(1);
  }
  return `${pathPart}${url.search}`;
}

function parseQueryParamsEntries(selection: string): Array<[string, string]> {
  const trimmed = selection.trim();
  const body = trimmed.startsWith('{') && trimmed.endsWith('}') ? trimmed.slice(1, -1) : trimmed;
  const entries: Array<[string, string]> = [];
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim().replace(/,$/, '');
    if (!line || line.startsWith('#')) continue;
    let key: string;
    let expr: string;
    if (line.startsWith('"') || line.startsWith("'")) {
      const quote = line[0];
      const end = line.indexOf(quote, 1);
      if (end === -1) continue;
      key = line.slice(1, end);
      const after = line.slice(end + 1).trim();
      if (!after.startsWith(':')) continue;
      expr = after.slice(1).trim();
    } else {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      key = line.slice(0, colon).trim();
      expr = line.slice(colon + 1).trim();
    }
    entries.push([key, expr]);
  }
  return entries;
}

function evalQueryParamExpr(
  expr: string,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
  },
): any {
  if (expr.startsWith('$(') && expr.endsWith(')')) {
    try {
      return JSON.parse(expr.slice(2, -1));
    } catch {
      return expr.slice(2, -1);
    }
  }
  // Mesh / Connectors templates: `{root.$request.query.x}`, `{$this.id}`, …
  if (expr.includes('{')) {
    return resolveTemplate(expr, { ...vars, config: {} });
  }
  // Support a small method subset used in emitted Connectors mappings, e.g.
  // `$args.id__in->joinNotNull(",")`
  const methodMatch = expr.match(/^(.*?)->([A-Za-z_][\w]*)\((.*)\)$/);
  if (methodMatch) {
    const left = evalQueryParamExpr(methodMatch[1].trim(), vars);
    const method = methodMatch[2];
    const rawArgs = methodMatch[3].trim();
    if (method === 'match') {
      return evalMatchMethod(left, rawArgs, vars.args || {}, {});
    }
    if (method === 'joinNotNull') {
      // Only arrays are joined; objects fall through for qs object serialization.
      if (!Array.isArray(left)) {
        return left;
      }
      const sepMatch = rawArgs.match(/^["'](.*)["']$/);
      const sep = sepMatch ? sepMatch[1] : ',';
      return left.filter(v => v != null).join(sep);
    }
    if (method === 'jsonStringify') {
      return JSON.stringify(left);
    }
    if (method === 'toString') {
      return left == null ? '' : String(left);
    }
  }
  if (expr.startsWith('$')) {
    return lookupVar(expr, vars);
  }
  return expr.replace(/^["']|["']$/g, '');
}

function applyHeaders(
  headers: Record<string, string>,
  mappings: Array<{ name: string; value?: string; from?: string }> | undefined,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
  },
) {
  if (!mappings) return;
  for (const mapping of mappings) {
    if (mapping.from) {
      const incoming =
        vars.context?.headers?.[mapping.from] ??
        vars.context?.request?.headers?.get?.(mapping.from) ??
        vars.context?.headers?.[mapping.from.toLowerCase()];
      if (incoming != null) {
        headers[mapping.name.toLowerCase()] = String(incoming);
      }
    } else if (mapping.value != null) {
      const resolved = resolveTemplate(mapping.value, {
        ...vars,
        config: {},
      });
      if (resolved == null) {
        continue;
      }
      // Skip empty interpolations from missing context/env, but still send an
      // explicitly provided empty GraphQL argument (`$args.x` === '').
      if (resolved === '') {
        const argMatch = String(mapping.value).match(/\$args\.(\w+)/);
        if (!argMatch) {
          continue;
        }
        const argVal = vars.args?.[argMatch[1]];
        if (argVal === undefined || argVal === null) {
          continue;
        }
      }
      headers[mapping.name.toLowerCase()] = String(resolved);
    }
  }
}

/** Runtime values available to Connectors selection / errors mapping. */
export type ConnectSelectionExtras = {
  status?: number;
  responseHeaders?: Headers;
  /** Virtual connectors / path templates: resolve `$args` / `$this` in selections. */
  vars?: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
    config?: Record<string, any>;
    batch?: Record<string, any>;
  };
};

/**
 * Copy `@odata.*` control properties from the raw JSON entity onto the Connectors
 * selection result so Hive residual OData resolvers (nav / bound ops) still see
 * `@odata.id` when the selection is not bare `$`.
 */
export function preserveODataEntityMetadata(selected: any, raw: any): any {
  if (selected == null || raw == null || typeof selected !== 'object') {
    return selected;
  }
  if (Array.isArray(selected)) {
    const rawItems = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { value?: unknown })?.value)
        ? (raw as { value: unknown[] }).value
        : null;
    if (!rawItems) {
      return selected;
    }
    return selected.map((item, i) => preserveODataEntityMetadata(item, rawItems[i]));
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return selected;
  }
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    if (key.startsWith('@odata.') && (selected as Record<string, unknown>)[key] === undefined) {
      (selected as Record<string, unknown>)[key] = (raw as Record<string, unknown>)[key];
    }
  }
  return selected;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Ensure `_odataId` is set for nested OData `@connect` paths when the upstream
 * omitted `@odata.id` (`odata.metadata=minimal`).
 */
export function ensureODataIdField(selected: any, raw: any, requestOriginPath: string): any {
  if (selected == null || typeof selected !== 'object') {
    return selected;
  }
  if (Array.isArray(selected)) {
    const rawItems = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { value?: unknown })?.value)
        ? (raw as { value: unknown[] }).value
        : null;
    const base = requestOriginPath ? stripTrailingSlash(requestOriginPath) : '';
    return selected.map((item, i) => {
      // List members under `odata.metadata=minimal` omit `@odata.id`. Prefer
      // `collectionUrl/key` over the bare collection URL so nested
      // `{$this._odataId}/Nav` resolves (`…/Trips/0/PlanItems`).
      const rawItem = rawItems?.[i];
      if (
        item != null &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        base &&
        (item as Record<string, unknown>)._odataId == null
      ) {
        const rec = item as Record<string, unknown>;
        const rawRec =
          rawItem != null && typeof rawItem === 'object' && !Array.isArray(rawItem)
            ? (rawItem as Record<string, unknown>)
            : undefined;
        const fromRaw = rawRec?.['@odata.id'];
        if (typeof fromRaw === 'string' && fromRaw) {
          rec._odataId = stripTrailingSlash(fromRaw);
        } else {
          const key =
            rec.TripId ??
            rec.PlanItemId ??
            rec.UserName ??
            rec.id ??
            rec.Id ??
            rawRec?.TripId ??
            rawRec?.PlanItemId ??
            rawRec?.UserName ??
            rawRec?.id ??
            rawRec?.Id;
          if (key != null && key !== '') {
            rec._odataId = `${base}/${key}`;
          }
        }
      }
      return ensureODataIdField(item, rawItem, requestOriginPath);
    });
  }
  const record = selected as Record<string, unknown>;
  if (record._odataId == null || record._odataId === '') {
    const fromRaw =
      (typeof record['@odata.id'] === 'string' && record['@odata.id']) ||
      (raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)['@odata.id']
        : undefined);
    const id =
      (typeof fromRaw === 'string' && fromRaw) ||
      (requestOriginPath ? stripTrailingSlash(requestOriginPath) : '');
    if (id) {
      record._odataId = stripTrailingSlash(String(id));
    }
  } else if (typeof record._odataId === 'string') {
    record._odataId = stripTrailingSlash(record._odataId);
  }
  return selected;
}

/**
 * Minimal selection evaluator:
 * - `id name` field picks
 * - `alias: path` aliases
 * - nested `field { a b }`
 * - `$` / `$root` for root
 * - `$status`
 * - `$response.headers.x` (Apollo multi-value array; use `->first`)
 * - `$ <fields>` — merge root with mapped fields (Mesh `exposeResponseMetadata`)
 *
 * Mesh-only `_response` fields (url / statusText / full headers map) are filled after
 * selection — Apollo has no `$request.url` / `$statusText` / whole-headers var.
 */
export function applySelection(selection: string, root: any, extras: ConnectSelectionExtras): any {
  const trimmed = selection.trim();
  if (!trimmed) {
    return root;
  }
  if (trimmed === '$' || trimmed === '$root') {
    return root;
  }
  // `$()` expressions (incl. multiline `$({ … })` / `$(null)`) evaluate as a whole so
  // JSON array envelopes (TJSON) are not mistaken for GraphQL list roots.
  if (trimmed.startsWith('$(')) {
    return evalPath(trimmed, root, extras);
  }
  // Mesh: `$ _response: { … }` — keep JSON body fields and overlay mapped keys.
  // Only when `$` is followed by whitespace (not `$status` / `$.x` / `$->…`).
  if (/^\$\s+\S/.test(trimmed)) {
    const rest = trimmed.replace(/^\$\s+/, '').trim();
    const mapped = rest ? evalSubSelection(rest, root, extras) : {};
    if (root != null && typeof root === 'object' && !Array.isArray(root)) {
      return { ...root, ...mapped };
    }
    return mapped;
  }
  // Connectors literals / single path expressions (not multi-field selections).
  // `$status->match(...)` may contain spaces inside the argument list.
  // Single-line `$.value { a b }` / `$.foo { alias: x }` must still run as a
  // subselection — otherwise aliases like `_odataId: $->get("@odata.id")` are dropped.
  if (
    trimmed.startsWith('$') &&
    !trimmed.includes('\n') &&
    !/^[A-Za-z_][\w]*\s*:/.test(trimmed) &&
    !/\{\s*[\s\S]+\}/.test(trimmed)
  ) {
    return evalPath(trimmed, root, extras);
  }
  return evalSubSelection(trimmed, root, extras);
}

function evalPath(path: string, root: any, extras: ConnectSelectionExtras): any {
  if (path === '$' || path === '$root') return root;
  if (path === '$status') return extras.status;
  // Bare `$args.x` / `$this.y` (no `->method`) — look up via vars. Method chains like
  // `$args.ids->first` fall through so `first`/`map`/`filter` handlers below still run;
  // their left operand then hits this branch.
  if (
    extras.vars &&
    !path.includes('->') &&
    /^\$args\b|^\$this\b|^\$env\b|^\$context\b|^\$batch\b|^\$config\b/.test(path)
  ) {
    return evalConnectorsVarExpr(path, extras.vars);
  }
  if (path.startsWith('$response.headers.')) {
    const name = path.slice('$response.headers.'.length).replace(/^['"]|['"]$/g, '');
    const value = extras.responseHeaders?.get(name);
    // Apollo: header vars are always arrays (fetch Headers.get → single joined string).
    return value == null ? undefined : [value];
  }
  // `$("lit")` / `$(123)` / `$($->get("k") ?? "default")` — expression wrapper.
  // Method chains after `$()` (e.g. `…->match`) are handled via split below.
  if (path.startsWith('$(')) {
    const closed = findBalancedParenClose(path, 1);
    if (closed === path.length - 1) {
      return evalConnectorsDollarParen(path.slice(2, closed), root, extras);
    }
  }
  // Method calls: `$status->match(...)`, `$->map(@->match(...))`, `$->entries`,
  // `$->entries->filter(@.key->ne("x"))`. Split on the last `->` at paren-depth 0 so
  // nested `->` inside args (and chained filters) stay intact.
  const methodCall = splitConnectorsMethodCall(path);
  if (methodCall) {
    const left = evalPath(methodCall.left.trim(), root, extras);
    const method = methodCall.method;
    const rawArgs = methodCall.args.trim();
    if (method === 'first') {
      return Array.isArray(left) ? left[0] : left;
    }
    if (method === 'size') {
      if (Array.isArray(left)) return left.length;
      if (left && typeof left === 'object') return Object.keys(left).length;
      if (typeof left === 'string') return left.length;
      return 0;
    }
    if (method === 'slice') {
      if (!Array.isArray(left) && typeof left !== 'string') return left;
      const parts = rawArgs.split(',').map(s => s.trim());
      const start = parts[0] ? Number(parts[0]) : 0;
      const end = parts[1] != null && parts[1] !== '' ? Number(parts[1]) : undefined;
      return (left as any).slice(start, end);
    }
    if (method === 'match') {
      return evalMatchMethod(left, rawArgs, root, extras);
    }
    if (method === 'get') {
      return evalGetMethod(left, rawArgs);
    }
    // Object → `[{ key, value }, …]` (Apollo Connectors; replaces Mesh `@dictionary`).
    if (method === 'entries') {
      if (left == null || typeof left !== 'object' || Array.isArray(left)) return [];
      return Object.keys(left).map(key => ({ key, value: left[key] }));
    }
    // Keep list elements for which `expr` is truthy (`@.key->ne("fixed")`).
    if (method === 'filter') {
      if (!Array.isArray(left)) return left;
      const elementExpr = rawArgs.trim();
      return left.filter(item => {
        if (elementExpr === '@') return Boolean(item);
        if (elementExpr.startsWith('@')) {
          return Boolean(evalPath(rewriteAtToDollar(elementExpr), item, extras));
        }
        return Boolean(evalPath(elementExpr, item, extras));
      });
    }
    if (method === 'ne') {
      const right = parseConnectorsLiteralArg(rawArgs);
      // Connectors None/null: treat null and undefined as equal for `ne(null)`.
      if (right === null) return left != null;
      return left !== right;
    }
    if (method === 'eq') {
      const right = parseConnectorsLiteralArg(rawArgs);
      if (right === null) return left == null;
      return left === right;
    }
    // `$obj->has("0")` — Mesh helper (Apollo `has` is still future/non-public).
    if (method === 'has') {
      if (left == null || typeof left !== 'object') return false;
      const key = String(parseConnectorsLiteralArg(rawArgs));
      return Object.prototype.hasOwnProperty.call(left, key) || key in (left as object);
    }
    // `$->eq(2)->and($->get(4)->get("0")->ne(null))` — combine booleans; arg eval against root.
    if (method === 'and') {
      let arg = rawArgs.trim();
      if (arg.startsWith('(') && arg.endsWith(')')) {
        arg = arg.slice(1, -1).trim();
      }
      return Boolean(left) && Boolean(evalPath(arg, root, extras));
    }
    // `$arr->contains("0")` — Apollo-public membership check.
    if (method === 'contains') {
      if (!Array.isArray(left)) return false;
      return left.includes(parseConnectorsLiteralArg(rawArgs));
    }
    // `$->map(@->match(...))` / `$->map(@.id)` / `$->map(@->{ ... })` — element transform.
    if (method === 'map') {
      if (!Array.isArray(left)) return left;
      const elementExpr = rawArgs.trim();
      return left.map(item => {
        if (elementExpr === '@') return item;
        if (elementExpr.startsWith('@')) {
          const afterAt = elementExpr.slice(1);
          // `@->{ ... }` / `@->[ ... ]` — lit object/array with `@` as the element.
          if (afterAt.startsWith('->{') || afterAt.startsWith('->[')) {
            const lit = afterAt.slice(2);
            return evalConnectorsLitExpr(rewriteAtToDollar(lit), item, extras);
          }
          if (afterAt.startsWith('{') || afterAt.startsWith('[')) {
            return evalConnectorsLitExpr(rewriteAtToDollar(afterAt), item, extras);
          }
          // `@->match(...)` / `@.id` — treat `@` as the element root.
          return evalPath(rewriteAtToDollar(elementExpr), item, extras);
        }
        return evalPath(elementExpr, item, extras);
      });
    }
    if (method === 'joinNotNull') {
      if (!Array.isArray(left)) return left;
      const sepMatch = rawArgs.match(/^["'](.*)["']$/);
      const sep = sepMatch ? sepMatch[1] : ',';
      return left.filter(v => v != null).join(sep);
    }
    // `$([a, b])->concat($args.ids)` — append array elements (TJSON list/set envelopes).
    // Prefer over LitArray `...` spreads (Apollo LitArray grammar has no spread).
    if (method === 'concat') {
      const right = evalConnectorsLitExpr(rawArgs.trim(), root, extras);
      const leftArr = Array.isArray(left) ? left : left == null ? [] : [left];
      const rightArr = Array.isArray(right) ? right : right == null ? [] : [right];
      return leftArr.concat(rightArr);
    }
    if (method === 'jsonStringify') {
      return JSON.stringify(left);
    }
    if (method === 'toString') {
      return left == null ? '' : String(left);
    }
  }
  // `$["TLSv1.3"]` / `$.foo["bar"]` — bracket keys (dots / reserved chars in JSON names).
  if (/^\$(\.|\[)/.test(path) || path === '$') {
    let rest = path === '$' || path === '$root' ? '' : path.replace(/^\$\.?/, '');
    if (path.startsWith('$[') || path.startsWith('$["') || path.startsWith("$['")) {
      rest = path.slice(1); // keep leading `[...]`
    }
    let cur: any = root;
    if (!rest) return cur;
    // Normalize `.a["b"]` / `["a"].b` into tokenizeVarPath shape
    const normalized = rest.startsWith('[') ? rest : `.${rest}`;
    for (const segment of tokenizeVarPath(normalized)) {
      if (cur == null) return undefined;
      cur = cur[segment];
    }
    return cur;
  }
  const parts = path.replace(/^\$\.?/, '').split('.');
  let cur = root;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

/**
 * Rewrite `@` / `@.x` element aliases to `$` / `$.x` for lit/path eval against the item.
 * Leaves `@` inside quoted strings alone (e.g. emails).
 */
function rewriteAtToDollar(expr: string): string {
  let out = '';
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === '"' || c === "'") {
      const q = c;
      out += c;
      i++;
      while (i < expr.length && expr[i] !== q) {
        if (expr[i] === '\\') {
          out += expr[i++];
          if (i < expr.length) out += expr[i++];
          continue;
        }
        out += expr[i++];
      }
      if (i < expr.length) out += expr[i++];
      continue;
    }
    if (c === '@' && expr[i + 1] === '.') {
      out += '$.';
      i += 2;
      continue;
    }
    if (c === '@') {
      out += '$';
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Index of the `)` that closes `s[openIdx]` (`(`), or -1. */
function findBalancedParenClose(s: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Connectors `$()` body: JSON literal, path/`->` expr, or `a ?? b` / `a ?! b`
 * (Apollo nullish coalescing — required before `->match` when `get` may be None).
 */
function evalConnectorsDollarParen(inner: string, root: any, extras: ConnectSelectionExtras): any {
  const trimmed = inner.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    // not a JSON literal
  }
  // Top-level `??` / `?!` (Apollo: `??` coalesces null|None; `?!` only None).
  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < trimmed.length && trimmed[i] !== q) {
        if (trimmed[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (depth === 0 && c === '?') {
      const op = trimmed.slice(i, i + 2);
      if (op === '??' || op === '?!') {
        const left = evalPath(trimmed.slice(0, i).trim(), root, extras);
        const rightRaw = trimmed.slice(i + 2).trim();
        const right = evalConnectorsDollarParen(rightRaw, root, extras);
        if (op === '??') {
          return left == null ? right : left;
        }
        // `?!` — only missing/None (undefined), not JSON null.
        return left === undefined ? right : left;
      }
    }
  }
  // Apollo LitArray / LitObject with embedded `$args` / paths (e.g. TJSON envelopes).
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return evalConnectorsLitExpr(trimmed, root, extras);
    } catch {
      /* fall through */
    }
  }
  if (trimmed.startsWith('$') || trimmed.includes('->') || /^[A-Za-z_]/.test(trimmed)) {
    return evalPath(trimmed, root, extras);
  }
  return trimmed;
}

/**
 * Evaluate Apollo Connectors LitExpr fragments used inside `$()`:
 * arrays/objects that mix JSON literals with `$args` / path selections / spreads.
 */
function evalConnectorsLitExpr(expr: string, root: any, extras: ConnectSelectionExtras): any {
  const trimmed = expr.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }
  // Parse containers before path/`->` so `$([$args.ids->size])` does not send
  // the whole array fragment through evalPath (which rejects `size]`).
  if (trimmed.startsWith('[')) {
    return evalConnectorsLitArray(trimmed, root, extras);
  }
  if (trimmed.startsWith('{')) {
    return evalConnectorsLitObject(trimmed, root, extras);
  }
  if (trimmed.startsWith('$(')) {
    const closed = findBalancedParenClose(trimmed, 1);
    if (closed > 0) {
      // Only unwrap `$()` when it is the whole fragment; otherwise keep chains
      // like `$([$args.ids]->size)` for evalPath.
      if (closed === trimmed.length - 1) {
        return evalConnectorsDollarParen(trimmed.slice(2, closed), root, extras);
      }
      return evalPath(trimmed, root, extras);
    }
  }
  if (trimmed.startsWith('$') || trimmed.includes('->')) {
    return evalPath(trimmed, root, extras);
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  return trimmed;
}

function splitConnectorsLitItems(inner: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < inner.length && inner[i] !== q) {
        if (inner[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      items.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = inner.slice(start).trim();
  if (last) items.push(last);
  return items;
}

function evalConnectorsLitArray(expr: string, root: any, extras: ConnectSelectionExtras): any[] {
  const inner = expr.trim().slice(1, -1);
  const out: any[] = [];
  for (const item of splitConnectorsLitItems(inner)) {
    if (!item) continue;
    if (item.startsWith('...')) {
      const spread = evalConnectorsLitExpr(item.slice(3).trim(), root, extras);
      if (Array.isArray(spread)) out.push(...spread);
      else if (spread != null) out.push(spread);
      continue;
    }
    out.push(evalConnectorsLitExpr(item, root, extras));
  }
  return out;
}

function evalConnectorsLitObject(
  expr: string,
  root: any,
  extras: ConnectSelectionExtras,
): Record<string, any> {
  const inner = expr.trim().slice(1, -1);
  const out: Record<string, any> = {};
  for (const item of splitConnectorsLitItems(inner)) {
    if (!item) continue;
    if (item.startsWith('...')) {
      const spread = evalConnectorsLitExpr(item.slice(3).trim(), root, extras);
      if (spread && typeof spread === 'object' && !Array.isArray(spread)) {
        Object.assign(out, spread);
      }
      continue;
    }
    const colon = findTopLevelColon(item);
    if (colon < 0) continue;
    const rawKey = item.slice(0, colon).trim();
    const rawVal = item.slice(colon + 1).trim();
    let key = rawKey;
    try {
      if (
        (rawKey.startsWith('"') && rawKey.endsWith('"')) ||
        (rawKey.startsWith("'") && rawKey.endsWith("'"))
      ) {
        key = JSON.parse(rawKey.includes("'") ? `"${rawKey.slice(1, -1)}"` : rawKey);
      }
    } catch {
      /* keep key */
    }
    out[key] = evalConnectorsLitExpr(rawVal, root, extras);
  }
  return out;
}

function findTopLevelColon(item: string): number {
  let depth = 0;
  for (let i = 0; i < item.length; i++) {
    const c = item[i];
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < item.length && item[i] !== q) {
        if (item[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ':' && depth === 0) return i;
  }
  return -1;
}

/**
 * Split `left->method` / `left->method(args)` on the last `->` outside parentheses.
 */
function splitConnectorsMethodCall(
  path: string,
): { left: string; method: string; args: string } | null {
  let depth = 0;
  let lastArrow = -1;
  for (let i = 0; i < path.length; i++) {
    const c = path[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && c === '-' && path[i + 1] === '>') {
      lastArrow = i;
    }
  }
  if (lastArrow < 0) return null;
  const after = path.slice(lastArrow + 2);
  const nameMatch = after.match(/^([A-Za-z_][\w]*)/);
  if (!nameMatch) return null;
  const method = nameMatch[1];
  const rest = after.slice(method.length);
  if (rest === '') {
    return { left: path.slice(0, lastArrow), method, args: '' };
  }
  if (rest.startsWith('(') && rest.endsWith(')')) {
    return { left: path.slice(0, lastArrow), method, args: rest.slice(1, -1) };
  }
  return null;
}

/**
 * Federation Connectors `$->get("key")` / `$args->get("special-key")` / `arr->get(0)`.
 * Preferred over `$["key"]` which Apollo Router's selection parser rejects with Eof.
 */
function evalGetMethod(left: any, rawArgs: string): any {
  if (left == null) return undefined;
  return left[parseConnectorsLiteralArg(rawArgs) as any];
}

/** Parse a Connectors method arg literal (`"x"`, `'x'`, `0`, `true`) or raw string. */
function parseConnectorsLiteralArg(rawArgs: string): any {
  const trimmed = rawArgs.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const quoted = trimmed.match(/^["'](.*)["']$/);
    if (quoted) return quoted[1];
    if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    return trimmed;
  }
}

/**
 * Federation Connectors `$x->match([key, value], …, [@, default])`.
 * Values may be nested exprs (e.g. `$.petType->match(...)`) for discriminator defaults.
 */
function evalMatchMethod(
  left: any,
  rawArgs: string,
  root: any = {},
  extras: ConnectSelectionExtras = {},
  vars?: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
    config?: Record<string, any>;
    batch?: Record<string, any>;
  },
): any {
  // Split top-level `[...]` groups (ignore brackets inside nested match args).
  const groups: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < rawArgs.length; i++) {
    const ch = rawArgs[i];
    if (ch === '[') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === ']') {
      depth--;
      if (depth === 0 && start >= 0) {
        groups.push(rawArgs.slice(start, i + 1));
        start = -1;
      }
    }
  }
  let fallback: any;
  for (const group of groups) {
    const inner = group.slice(1, -1).trim();
    // [@, value] default arm — `[@, @]` means pass through the unmatched left value.
    if (inner.startsWith('@')) {
      const comma = findTopLevelComma(inner);
      const valueRaw = comma >= 0 ? inner.slice(comma + 1).trim() : 'null';
      fallback = valueRaw === '@' ? left : parseMatchValue(valueRaw, root, extras, vars);
      continue;
    }
    const comma = findTopLevelComma(inner);
    if (comma < 0) continue;
    const key = parseMatchValue(inner.slice(0, comma).trim(), root, extras, vars);
    const value = parseMatchValue(inner.slice(comma + 1).trim(), root, extras, vars);
    if (Object.is(key, left) || key === left || String(key) === String(left)) {
      return value;
    }
  }
  return fallback;
}

function findTopLevelComma(inner: string): number {
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < inner.length) {
        if (inner[i] === '\\') {
          i += 2;
          continue;
        }
        if (inner[i] === quote) break;
        i++;
      }
      continue;
    }
    if (ch === '[' || ch === '(' || ch === '{') depth++;
    else if (ch === ']' || ch === ')' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) return i;
  }
  return -1;
}

function parseMatchValue(
  raw: string,
  root: any = {},
  extras: ConnectSelectionExtras = {},
  vars?: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
    config?: Record<string, any>;
    batch?: Record<string, any>;
  },
): any {
  if (raw === '@') return undefined;
  // Abstract-type branch objects: `{ __typename: "Electronics", warranty }`
  // Rewrite string literals to `$("…")` so selection eval can resolve them.
  if (raw.startsWith('{') && raw.endsWith('}')) {
    const inner = raw.slice(1, -1).trim();
    const rewritten = inner.replace(
      /:(\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g,
      (_m, sp: string, lit: string) => `:${sp}$(${lit})`,
    );
    return evalSubSelection(rewritten, root, extras);
  }
  // Path/arg templates: `$args.x` / `$this.y` need the Connectors var map, not the
  // selection root (which is often `{}` for request-path matches).
  if (vars && /^\$args\b|^\$this\b|^\$env\b|^\$context\b|^\$batch\b|^\$config\b/.test(raw)) {
    return evalConnectorsVarExpr(raw, vars);
  }
  if (raw.startsWith('$') || raw.includes('->')) {
    return evalPath(raw, root, extras);
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw.replace(/^["']|["']$/g, '');
  }
}

/**
 * Evaluate a Connectors mapping expression used by `errors.*` / `isSuccess`.
 * Bare paths like `error.message` are relative to the response body (Apollo docs).
 */
function evalMappingExpression(
  expr: string | undefined,
  root: any,
  extras: ConnectSelectionExtras,
): any {
  if (expr == null || expr === '') return undefined;
  const trimmed = expr.trim();
  if (
    trimmed.startsWith('$') ||
    trimmed.includes('->') ||
    trimmed.includes('{') ||
    /^[A-Za-z_$]/.test(trimmed)
  ) {
    // Object / multi-field selection for errors.extensions
    if (trimmed.includes('\n') || (trimmed.includes(':') && !trimmed.startsWith('$'))) {
      try {
        return applySelection(trimmed, root, extras);
      } catch {
        /* fall through to path */
      }
    }
    if (trimmed.startsWith('$') || trimmed.includes('->')) {
      return evalPath(trimmed, root, extras);
    }
    // Bare path: `error.message` → root.error.message
    return evalPath(`$.${trimmed}`, root, extras);
  }
  return trimmed;
}

function evalSubSelection(selection: string, root: any, extras: ConnectSelectionExtras): any {
  if (Array.isArray(root)) {
    return root.map(item => evalSubSelection(selection, item, extras));
  }
  const tokens = tokenizeSelection(selection);
  // Apollo: a lone path root like `$.products { id }` is the field value itself,
  // not `{ "$.products": [...] }`. Explicit aliases (`products: $.products { id }`) wrap.
  if (
    tokens.length === 1 &&
    tokens[0].source.startsWith('$') &&
    tokens[0].alias === tokens[0].source
  ) {
    const source =
      tokens[0].source === '$' || tokens[0].source === '$root'
        ? root
        : evalPath(tokens[0].source, root, extras);
    if (tokens[0].sub) {
      return evalSubSelection(tokens[0].sub, source, extras);
    }
    return source;
  }
  const result: Record<string, any> = {};
  for (const token of tokens) {
    if (token.spread) {
      const spreadValue = evalPath(token.source, root, extras);
      if (spreadValue && typeof spreadValue === 'object' && !Array.isArray(spreadValue)) {
        Object.assign(result, spreadValue);
      }
      continue;
    }
    if (token.sub) {
      const source = token.source === '$' ? root : evalPath(token.source, root, extras);
      result[token.alias] = evalSubSelection(token.sub, source, extras);
    } else {
      result[token.alias] = evalPath(token.source, root, extras);
    }
  }
  return result;
}

function readSelectionIdent(s: string, start: number): { value: string; end: number } {
  let i = start;
  if (s[i] === '"' || s[i] === "'") {
    const quote = s[i];
    i++;
    let value = '';
    while (i < s.length && s[i] !== quote) {
      if (s[i] === '\\' && i + 1 < s.length) {
        value += s[i + 1];
        i += 2;
        continue;
      }
      value += s[i];
      i++;
    }
    if (s[i] === quote) i++;
    return { value, end: i };
  }
  // `$status->match([200, "User"], …)`, `$["patent-id"]`, `$.foo["bar"]->match(...)`,
  // `$("literal")` / `$($->get("k") ?? "default")->match(...)` (balanced `$()` + chains).
  if (s[i] === '$') {
    i++;
    // `$()` — balanced (nested get/match / `??` inside).
    if (s[i] === '(') {
      const close = findBalancedParenClose(s, i);
      if (close < 0) {
        return { value: s.slice(start), end: s.length };
      }
      i = close + 1;
    } else {
      // Don't consume the `-` of `->` into the path segment.
      while (i < s.length && /[A-Za-z0-9_.]/.test(s[i])) i++;
      // Bracket accessors: `["key"]` / `['key']` / `[0]`
      while (s[i] === '[') {
        i++;
        if (s[i] === '"' || s[i] === "'") {
          const quote = s[i++];
          while (i < s.length && s[i] !== quote) {
            if (s[i] === '\\' && i + 1 < s.length) i += 2;
            else i++;
          }
          if (s[i] === quote) i++;
        } else {
          while (i < s.length && s[i] !== ']') i++;
        }
        if (s[i] === ']') i++;
        while (i < s.length && /[A-Za-z0-9_.]/.test(s[i])) i++;
      }
    }
    while (s.slice(i, i + 2) === '->') {
      i += 2;
      while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) i++;
      if (s[i] === '(') {
        const close = findBalancedParenClose(s, i);
        if (close < 0) {
          i = s.length;
          break;
        }
        i = close + 1;
      }
    }
    return { value: s.slice(start, i), end: i };
  }
  // Plain field / path, optionally with `->method(...)` (e.g. `test->match([0, "_0"], …)`).
  while (i < s.length && /[A-Za-z0-9_$.]/.test(s[i])) i++;
  while (s.slice(i, i + 2) === '->') {
    i += 2;
    while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) i++;
    if (s[i] === '(') {
      let depth = 0;
      for (; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
      }
    }
  }
  return { value: s.slice(start, i), end: i };
}

type SelectionToken = { alias: string; source: string; sub?: string; spread?: boolean };

function tokenizeSelection(selection: string): SelectionToken[] {
  const tokens: SelectionToken[] = [];
  let i = 0;
  const s = selection.trim();
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    const start = i;
    // Abstract-type spread: `... $_type->match([...])` merges into the parent object.
    if (s.slice(i, i + 3) === '...') {
      i += 3;
      while (i < s.length && /\s/.test(s[i])) i++;
      const readSpread = readSelectionIdent(s, i);
      if (!readSpread.value) {
        i = Math.max(i, start + 1);
        continue;
      }
      i = readSpread.end;
      tokens.push({ alias: '', source: readSpread.value, spread: true });
      continue;
    }
    // alias or field
    let read = readSelectionIdent(s, i);
    if (!read.value) {
      // Avoid infinite loops on unexpected characters
      i++;
      continue;
    }
    const name = read.value;
    i = read.end;
    while (i < s.length && /\s/.test(s[i])) i++;
    let alias = name;
    let source = name;
    if (s[i] === ':') {
      i++;
      while (i < s.length && /\s/.test(s[i])) i++;
      // Apollo entity-ref / object literal: `supplier: { id: supplierId }` —
      // fields are relative to the *parent* root, not `$.supplier`.
      if (s[i] === '{') {
        source = '$';
        alias = name;
      } else {
        read = readSelectionIdent(s, i);
        source = read.value;
        i = read.end;
        alias = name;
        while (i < s.length && /\s/.test(s[i])) i++;
      }
    }
    let sub: string | undefined;
    if (s[i] === '{') {
      let depth = 0;
      const subStart = i + 1;
      for (; i < s.length; i++) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') {
          depth--;
          if (depth === 0) {
            sub = s.slice(subStart, i).trim();
            i++;
            break;
          }
        }
      }
      if (!source) source = alias;
    }
    if (i === start) {
      i++;
      continue;
    }
    tokens.push({ alias, source: source || alias, sub });
  }
  return tokens;
}

function pickHttp(http: ConnectHttp | undefined): { method: string; path: string } | undefined {
  if (!http) return undefined;
  for (const method of HTTP_METHODS) {
    if (http[method]) {
      return { method, path: http[method]! };
    }
  }
  return undefined;
}

/**
 * Detect raw binary request bodies (stream / Blob / Buffer / non-JSON Content-Type).
 * Prefer the runtime value shape and Content-Type — not GraphQL scalar names.
 */
function isRawBinaryConnectBody(input: unknown, contentType: string | undefined): boolean {
  // Value shape: graphql-upload streams, Blob/File, Buffer — not GraphQL type names.
  if (isFileUpload(input)) {
    return true;
  }
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    return true;
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    return true;
  }
  if (!contentType) {
    return false;
  }
  const ct = contentType.toLowerCase();
  // Structured body encodings keep the JSON / form paths below.
  if (
    ct.includes('json') ||
    ct.includes('xml') ||
    ct.startsWith('text/') ||
    ct.includes('form-urlencoded') ||
    ct.includes('multipart/form-data')
  ) {
    return false;
  }
  // Any other explicit Content-Type (octet-stream, image/*, …) → raw body.
  return true;
}

/**
 * Evaluate `@connect(http.body:)` JSONSelection to a JS value (object/array/scalar).
 * Callers serialize as JSON, XML (FXP), or form-urlencoded as needed.
 */
function evaluateConnectBodySelection(
  bodySelection: string | undefined,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
  },
  opts: {
    schema?: GraphQLSchema;
    field?: GraphQLField<any, any>;
    /** Flatten OData open-type `rest` bags only - never rewrite ordinary REST inputs. */
    odataOpenTypes?: boolean;
  } = {},
): any {
  if (!bodySelection) return undefined;
  const trimmed = bodySelection.trim();
  const flattenOpen = Boolean(opts.odataOpenTypes);

  const recoverInput = (value: any, argName: string) => {
    if (value == null || !opts.schema || !opts.field) {
      return value;
    }
    const argDef = opts.field.args?.find(arg => arg.name === argName);
    if (!argDef) {
      return value;
    }
    return resolveDataByUnionInputType(
      value && typeof value === 'object' ? structuredClone(value) : value,
      argDef.type,
      opts.schema,
    );
  };

  const selectionVars = {
    args: vars.args,
    thisValue: vars.thisValue,
    env: vars.env,
    context: vars.context,
    config: {},
  };
  // Object body with baked base literals + `...$args.input` (Connectors-friendly merge).
  if (trimmed.startsWith('{') && trimmed.includes('$args')) {
    const recoveredArgs = { ...vars.args };
    if ('input' in recoveredArgs) {
      recoveredArgs.input = recoverInput(recoveredArgs.input, 'input');
      if (flattenOpen && recoveredArgs.input != null && typeof recoveredArgs.input === 'object') {
        rebuildOpenInputObjects(recoveredArgs.input);
      }
    }
    return applySelection(trimmed, {}, { vars: { ...selectionVars, args: recoveredArgs } });
  }
  if (trimmed === '$args') {
    // Only clone+flatten when open-type `rest` is present - leave bound-action
    // arg objects alone (no clone); open-type bodies are plain JSON values.
    const args = vars.args;
    const needsFlatten =
      flattenOpen &&
      args != null &&
      typeof args === 'object' &&
      ('rest' in args ||
        (args.input != null && typeof args.input === 'object' && 'rest' in args.input));
    if (needsFlatten) {
      // `vars.args` may be a Proxy (serializeArgumentsForInterpolation) —
      // structuredClone rejects Proxies, so materialize plain values first.
      const plain: Record<string, unknown> = {};
      for (const key of Object.keys(args as object)) {
        plain[key] = (args as Record<string, unknown>)[key];
      }
      const clone = structuredClone(plain);
      rebuildOpenInputObjects(clone);
      return clone;
    }
    return args;
  }
  if (trimmed === '$args.input' || trimmed.startsWith('$args.input')) {
    const input = recoverInput(vars.args.input, 'input');
    // Open-type OData inputs carry overflow under `rest` - flatten into the body.
    if (flattenOpen && input != null && typeof input === 'object') {
      rebuildOpenInputObjects(input);
    }
    // `$args.input { alias: field }` subselection
    const subMatch = trimmed.match(/^\$args\.input\s*\{([\s\S]*)\}$/);
    if (subMatch) {
      return applySelection(subMatch[1], input, {});
    }
    if (trimmed === '$args.input') {
      return input;
    }
  }
  if (trimmed.startsWith('$args.')) {
    const pathMatch = trimmed.match(/^\$args\.(\w+)(\s*\{([\s\S]*)\})?$/);
    if (pathMatch) {
      const value = recoverInput(vars.args[pathMatch[1]], pathMatch[1]);
      if (pathMatch[3] != null) {
        return applySelection(pathMatch[3], value, {});
      }
      return value;
    }
  }
  if (trimmed.startsWith('$({') && trimmed.endsWith('})')) {
    try {
      return JSON.parse(trimmed.slice(2, -1));
    } catch {
      /* fall through */
    }
  }
  // Multi-field / nested body selections (`"soap:Envelope": { … id: $args.id }`) need
  // `$args` / `$this` via extras.vars. Root is `vars.args` so bare paths (`name`, `$`)
  // resolve request arguments (Apollo `http.body: "name"` / `"$"`).
  try {
    return applySelection(trimmed, vars.args, { vars: selectionVars });
  } catch {
    return vars.args;
  }
}

/** OData-only Connectors runtime opts (mirrors `@transport(options: { odata: … })`). */
export type ConnectODataOptions = {
  /** `$expand` selected nav and prefer embedded values over per-nav HTTP. */
  expandNavProps?: boolean;
  /** Coalesce sibling `@connect` HTTP into `POST /$batch`. */
  batch?: ODataBatchMode;
  /** Shared DataLoader fetch — usually created by `processConnectDirectives`. */
  batchFetch?: ReturnType<typeof createODataBatchFetch>;
  /** Extra credential header names for `/$batch` partition / outer forward. */
  securityHeaderNames?: readonly string[];
};

export type ConnectFieldResolverOptions = {
  globalFetch?: MeshFetch;
  log?: HiveLogger;
  timeout?: number;
  queryStringOptions?: MeshQsOptions;
  odata?: ConnectODataOptions;
};

/**
 * Custom nav args (e.g. `limit`) cannot ride `$expand`; queryOptions alone can.
 * Prefer-embedded must not skip the connector when those args need a dedicated GET.
 */
function navArgsRequireDedicatedFetch(args: Record<string, unknown> | null | undefined): boolean {
  if (args == null || typeof args !== 'object') {
    return false;
  }
  for (const key of Object.keys(args)) {
    if (key === 'queryOptions') {
      continue;
    }
    if (args[key] != null) {
      return true;
    }
  }
  return false;
}

/** Marks a mapped Connectors selection result so prefer-embedded can skip rematch. */
const ODATA_SELECTION_APPLIED = Symbol.for('@graphql-mesh/odata.selectionApplied');

/** Identity / bare path — applySelection returns raw; do not tag nested pass-through. */
function isRawPassThroughSelection(selection: string): boolean {
  const t = selection.trim();
  if (!t || t === '$' || t === '$root') {
    return true;
  }
  // Bare `$.value` / `$.person` with no `{ … }` mapping block.
  return /^\$(\.[A-Za-z_][\w]*)+$/.test(t);
}

/**
 * Body of a root `$.name { … }` wrapper when that wraps the whole selection.
 * Covers OData `$.value { … }` and hand-written roots like `$.person { … }` so
 * nestedMappedSelections sees `orders`, not the wrapper name `person`.
 */
function dollarRootSelectionBody(selection: string): string | null {
  const trimmed = selection.trim();
  const m = /^\$\.([A-Za-z_][\w]*)\s*\{/.exec(trimmed);
  if (!m) return null;
  const open = trimmed.indexOf('{', m.index);
  if (open < 0) return null;
  let depth = 0;
  let close = -1;
  for (let i = open; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0) {
    return trimmed.slice(open + 1);
  }
  // Only unwrap when this `{ … }` is the whole selection (root wrapper).
  if (trimmed.slice(close + 1).trim() !== '') {
    return null;
  }
  return trimmed.slice(open + 1, close);
}

/**
 * Fields at this selection level that have an explicit `{ … }` subselection
 * (actually mapped). Pass-through paths like `Orders` / `orders: Orders` without
 * braces are omitted so raw expand children stay unmarked for nav rematch.
 */
function nestedMappedSelections(selection: string): Map<string, string> {
  const map = new Map<string, string>();
  const body = dollarRootSelectionBody(selection) ?? selection.trim();
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i]!)) i++;
    if (i >= body.length) break;
    const rest = body.slice(i);
    // `orders: Orders { … }` or `Orders { … }` or `orders { … }`
    const m = /^([A-Za-z_][\w]*)\s*(?::\s*[A-Za-z_][\w]*)?\s*\{/.exec(rest);
    if (!m) {
      i++;
      continue;
    }
    const gqlName = m[1]!;
    const open = i + m[0].length - 1;
    let depth = 0;
    let close = -1;
    for (let j = open; j < body.length; j++) {
      const c = body[j];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          close = j;
          break;
        }
      }
    }
    if (close < 0) break;
    map.set(gqlName, body.slice(open + 1, close));
    i = close + 1;
  }
  return map;
}

/**
 * Mark values a selection actually mapped. Raw `$` pass-through is left unmarked
 * so prefer-embedded can still run nav selections like `$.value { id name: Name }`.
 * Explicit nested mappings (`orders: Orders { id name: Name }`) stay marked so
 * rematch does not wipe already-mapped fields.
 */
function markSelectionApplied(value: unknown, selection = ''): unknown {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  const trimmed = selection.trim();
  if (isRawPassThroughSelection(trimmed)) {
    return value;
  }

  const rootBody = dollarRootSelectionBody(trimmed);
  if (Array.isArray(value)) {
    // `$.value { … }` list mapping — mark each item with the entity body.
    const itemSelection = rootBody ?? trimmed;
    for (const item of value) {
      markSelectionApplied(item, itemSelection);
    }
    return value;
  }

  Object.defineProperty(value, ODATA_SELECTION_APPLIED, {
    value: true,
    enumerable: false,
    configurable: true,
  });

  const nested = nestedMappedSelections(rootBody ?? trimmed);
  const obj = value as Record<string, unknown>;
  for (const [fieldName, subSelection] of nested) {
    if (Object.prototype.hasOwnProperty.call(obj, fieldName)) {
      markSelectionApplied(obj[fieldName], subSelection);
      continue;
    }
    const found = Object.keys(obj).find(k => k.toLowerCase() === fieldName.toLowerCase());
    if (found) {
      markSelectionApplied(obj[found], subSelection);
    }
  }
  return value;
}

/**
 * Body of the primary selection object (`$.value { … }` or first `{ … }`), else
 * the whole string. Nested blocks inside that body are stripped so alias scans
 * stay at this level — `customer: Customer { id: Id }` must not prove the outer
 * nav value is already mapped.
 */
function selectionTopLevelAliasScanTarget(selection: string): string {
  const trimmed = selection.trim();
  const valueMatch = /\$\.value\s*\{/.exec(trimmed);
  let open = -1;
  if (valueMatch) {
    open = trimmed.indexOf('{', valueMatch.index);
  } else {
    open = trimmed.indexOf('{');
  }
  let body = trimmed;
  if (open >= 0) {
    let depth = 0;
    let close = -1;
    for (let i = open; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    body = close >= 0 ? trimmed.slice(open + 1, close) : trimmed.slice(open + 1);
  }
  let out = '';
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '{') {
      depth++;
      continue;
    }
    if (c === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0) {
      out += c;
    }
  }
  return out;
}

/** True when prefer-embedded value is already GraphQL-shaped (do not re-run selection). */
function navValueAlreadyMapped(embedded: unknown, selection: string): boolean {
  const sample = Array.isArray(embedded)
    ? embedded.find(item => item != null && typeof item === 'object')
    : embedded;
  if (sample == null || typeof sample !== 'object' || Array.isArray(sample)) {
    return false;
  }
  const obj = sample as Record<string, unknown>;
  // Explicit parent-applied selection marker (set after applySelection on this value).
  if (Object.prototype.hasOwnProperty.call(obj, ODATA_SELECTION_APPLIED)) {
    return true;
  }
  if ('__typename' in obj) {
    return true;
  }
  // Only top-level remaps in this field's selection (ignore nested object aliases).
  const topLevel = selectionTopLevelAliasScanTarget(selection);
  for (const match of topLevel.matchAll(/\b([A-Za-z_][\w]*)\s*:\s*([A-Za-z_][\w]*)\b/g)) {
    const gqlName = match[1];
    const wireName = match[2];
    if (!gqlName || !wireName || gqlName === wireName) {
      continue;
    }
    if (gqlName.startsWith('$') || gqlName === '__typename') {
      continue;
    }
    if (
      Object.prototype.hasOwnProperty.call(obj, gqlName) &&
      !Object.prototype.hasOwnProperty.call(obj, wireName)
    ) {
      return true;
    }
  }
  return false;
}

function buildBody(
  bodySelection: string | undefined,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
  },
  opts: {
    schema?: GraphQLSchema;
    field?: GraphQLField<any, any>;
    /** Flatten OData open-type `rest` bags only - never rewrite ordinary REST inputs. */
    odataOpenTypes?: boolean;
  } = {},
): string | undefined {
  const value = evaluateConnectBodySelection(bodySelection, vars, opts);
  if (value === undefined) return undefined;
  return JSON.stringify(value);
}

export function addConnectFieldResolver(
  schema: GraphQLSchema,
  field: GraphQLField<any, any>,
  connectArgs: ConnectArgs,
  opts: ConnectFieldResolverOptions = {},
) {
  const log = opts.log || new Logger({ prefix: 'connect' });
  const sources = getSourceMap(schema);
  const source = connectArgs.source ? sources.get(connectArgs.source) : undefined;
  const picked = pickHttp(connectArgs.http);
  // Schema/field qs + timeout come from `@transport(options:)` / serve-time entry.
  const queryStringOptions: MeshQsOptions = { ...opts.queryStringOptions };
  const timeout = opts.timeout;
  const expandNavProps = Boolean(opts.odata?.expandNavProps);
  const odataBatchFetch = opts.odata?.batchFetch;
  // Prefer-embedded: expandNavProps + literal `@source` Accept `odata.metadata=…`.
  // Schema-static — no per-call header resolve / empty arg stubs.
  const preferEmbeddedNav = expandNavProps && hasODataMetadataAcceptHeader(source?.http?.headers);

  field.resolve = async (root, args, context, info: GraphQLResolveInfo) => {
    // When `$expand` / parent selection already put this field on `root`, skip HTTP.
    // Apollo may skip via planner; Hive always invokes the field resolver.
    // Non-queryOptions nav args are excluded from `$expand` - never reuse embedded
    // for those (connector must apply limit/filter args via its own HTTP).
    const navArgsNeedFetch = navArgsRequireDedicatedFetch(args);
    if (
      preferEmbeddedNav &&
      !navArgsNeedFetch &&
      root != null &&
      typeof root === 'object' &&
      info?.fieldName &&
      Object.prototype.hasOwnProperty.call(root, info.fieldName) &&
      (root as Record<string, unknown>)[info.fieldName] != null
    ) {
      const embedded = (root as Record<string, unknown>)[info.fieldName];
      const selection = connectArgs.selection || '$';
      const parentId =
        typeof (root as Record<string, unknown>)._odataId === 'string'
          ? ((root as Record<string, unknown>)._odataId as string)
          : '';
      // Expanded members need `/People/p/Orders/o`, not `/People/p/o` — use the nav
      // segment from the connector GET path (fallback: GraphQL field name).
      const navCollectionBase = (() => {
        const base = parentId ? stripTrailingSlash(parentId) : '';
        if (!base) return '';
        let nav = '';
        const getPath = connectArgs.http?.GET;
        if (typeof getPath === 'string') {
          const pathOnly = getPath.split('?')[0].replace(/\/+$/, '');
          const parts = pathOnly.split('/').filter(Boolean);
          const last = parts[parts.length - 1];
          if (last && !last.includes('{')) {
            nav = last;
          }
        }
        if (!nav && info?.fieldName) {
          nav = info.fieldName;
        }
        return nav ? `${base}/${nav}` : base;
      })();
      // Parent `@connect` selection may already have mapped `__typename` (baked
      // `$expand` + inline nav). Re-running `->match` on mapped objects loses
      // `@odata.type` and collapses every row to the default union member.
      // Same for `gql: Wire` remaps already applied (e.g. `userName: UserName`).
      // Still complete `_odataId` — parent ensureODataIdField does not walk nested nav.
      if (navValueAlreadyMapped(embedded, selection)) {
        return ensureODataIdField(embedded, embedded, navCollectionBase);
      }
      const extras = {
        status: 200,
        responseHeaders: new Headers(),
        vars: {
          args: args || {},
          thisValue: root,
          env: process.env as Record<string, string>,
          context: context || {},
        },
      };
      // Expanded nav is a raw entity/array; `$.value { ... }` selections need a wrapper.
      let mapped: unknown;
      if (Array.isArray(embedded) && selection.includes('$.value')) {
        mapped = applySelection(selection, { value: embedded }, extras);
      } else if (Array.isArray(embedded)) {
        mapped = embedded.map(item => applySelection(selection, item, extras));
      } else {
        mapped = applySelection(selection, embedded, extras);
      }
      return ensureODataIdField(
        markSelectionApplied(mapped, selection),
        embedded,
        navCollectionBase,
      );
    }

    // Virtual connector: no http — selection may only use $args / $this / literals.
    if (!picked) {
      const selection = connectArgs.selection || '$({})';
      if (
        /\$root\b/.test(selection) ||
        /\$status\b/.test(selection) ||
        /\$response\b/.test(selection) ||
        /\$batch\b/.test(selection)
      ) {
        throw new GraphQLError(
          'Virtual connector selection cannot use $root, $status, $response, or $batch',
          { extensions: { code: 'CONNECTOR_VALIDATE' } },
        );
      }
      // `$this` / `$args` — single expr (`$this["TLSv1.3"]`) or multi-field (`id: $args.id`).
      const vars = {
        args: args || {},
        thisValue: root,
        env: process.env,
        context: context || {},
        config: {},
      };
      const trimmedSel = selection.trim();
      const isSingleVarExpr =
        /^\$((args|this|env|context|batch|config)\b|\()/.test(trimmedSel) &&
        !/^[A-Za-z_][\w]*\s*:/.test(trimmedSel) &&
        !trimmedSel.includes('\n');
      if (isSingleVarExpr) {
        return evalConnectorsVarExpr(trimmedSel, vars);
      }
      return applySelection(selection, root || {}, { vars });
    }

    // Serialize scalars (DateTime → ISO, etc.) before path/header/query interpolation —
    // same Proxy pattern as Mesh httpOperation.
    const rawArgs = args || {};
    const argsSerializeProxy = new Proxy(rawArgs, {
      get(target, argName) {
        const value = target[argName as string];
        const argDef = field.args?.find(arg => arg.name === String(argName));
        if (argDef) {
          return serializeArgumentsForInterpolation(value, argDef.type);
        }
        return value;
      },
    });
    const vars = {
      args: argsSerializeProxy as Record<string, any>,
      thisValue: root,
      env: process.env,
      context: context || {},
      config: {},
    };

    const baseURL = resolveTemplate(source?.http?.baseURL || '', vars);
    // `{$this._odataId}/Nav` when `@odata.id` has a trailing slash → `…//Nav`.
    // Collapse those (keep `https://`).
    const collapseExtraSlashes = (u: string) => u.replace(/([^:])\/{2,}/g, '$1/');
    // Path templates percent-encode expression values; `_odataId` stays raw (full URL).
    // Absolute connector URLs skip baseURL join.
    // Match Mesh httpOperation (`urlJoin(base, path)`): empty base keeps relative paths
    // so test mocks like `fetch('pets/1')` keep working.
    const path = resolveTemplate(picked.path, vars, { encodeValues: true });
    let fullPath = /^https?:\/\//i.test(path)
      ? collapseExtraSlashes(path)
      : urlJoin(baseURL || '', path) || path;

    const resolveArg = (argName: string, value: any) => {
      const argDef = field.args?.find(arg => arg.name === argName);
      if (!argDef || value == null || typeof value !== 'object') {
        return value;
      }
      return resolveDataByUnionInputType(structuredClone(value), argDef.type, schema);
    };
    fullPath = applyQueryParams(
      fullPath,
      source?.http?.queryParams,
      vars,
      queryStringOptions,
      resolveArg,
    );
    fullPath = applyQueryParams(
      fullPath,
      connectArgs.http?.queryParams,
      vars,
      queryStringOptions,
      resolveArg,
    );
    const requestUrlForMeta = (() => {
      try {
        const abs = /^https?:\/\//i.test(fullPath)
          ? new URL(fullPath)
          : new URL(fullPath, 'http://localhost/');
        return {
          href: fullPath,
          originPath: `${abs.origin}${abs.pathname}`,
          query: Object.fromEntries(abs.searchParams.entries()),
        };
      } catch {
        return {
          href: fullPath,
          originPath: fullPath.split('?')[0],
          query: {} as Record<string, string>,
        };
      }
    })();

    const headers: Record<string, string> = {};
    applyHeaders(headers, source?.http?.headers, vars);
    applyHeaders(headers, connectArgs.http?.headers, vars);

    const method = picked.method;
    // OData dual-runtime: `Accept: …;odata.metadata=…` is a normal Connectors header
    // (Router sends it as-is). Hive additionally projects `$select` / `$expand`.
    if ((method === 'GET' || method === 'HEAD') && isODataMetadataAccept(headers) && info) {
      fullPath = appendODataSelectExpand(fullPath, info, connectArgs.selection, expandNavProps);
    }
    const requestInit: MeshFetchRequestInit = {
      method,
      headers,
    };
    if (timeout) {
      requestInit.signal = AbortSignal.timeout(timeout);
    }
    let requestBody: any;
    if (method !== 'GET' && method !== 'HEAD') {
      const contentType = Object.entries(headers).find(
        ([k]) => k.toLowerCase() === 'content-type',
      )?.[1];
      // Raw binary upload: stream/Blob/Buffer value or non-structured Content-Type.
      const binaryUpload = rawArgs.input !== undefined ? await rawArgs.input : undefined;
      if (isRawBinaryConnectBody(binaryUpload, contentType)) {
        if (isFileUpload(binaryUpload)) {
          requestInit.body = binaryUpload.createReadStream() as any;
          const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === 'content-type');
          if (!hasContentType) {
            headers['content-type'] = binaryUpload.mimetype;
          }
        } else {
          requestInit.body = binaryUpload;
        }
        requestBody = requestInit.body;
      } else if (contentType?.includes('multipart/form-data')) {
        // Multipart needs the live File/Blob values from args (not JSON round-trip).
        delete headers['content-type'];
        delete headers['Content-Type'];
        const input =
          connectArgs.http?.body === '$args.input' ||
          connectArgs.http?.body?.startsWith('$args.input')
            ? rawArgs.input
            : rawArgs;
        const formData = new FormData();
        if (input && typeof input === 'object') {
          for (const key of Object.keys(input)) {
            const inputValue = input[key];
            if (inputValue == null) continue;
            let formDataValue: Blob | string;
            if (typeof inputValue === 'object') {
              if (inputValue instanceof File) {
                formDataValue = inputValue;
              } else if (isFileUpload(inputValue)) {
                formDataValue = new File([inputValue.createReadStream() as any], 'file', {
                  type: inputValue.mimetype,
                });
              } else if (inputValue.name && inputValue instanceof Blob) {
                formDataValue = new File([inputValue], (inputValue as File).name, {
                  type: inputValue.type,
                });
              } else if (typeof inputValue.arrayBuffer === 'function') {
                const arrayBuffer = await inputValue.arrayBuffer();
                formDataValue = inputValue.name
                  ? new File([arrayBuffer], inputValue.name, { type: inputValue.type })
                  : new Blob([arrayBuffer], { type: inputValue.type });
              } else {
                formDataValue = JSON.stringify(inputValue);
              }
            } else {
              formDataValue = String(inputValue);
            }
            formData.append(String(key), formDataValue as any);
          }
        }
        requestBody = formData;
        requestInit.body = formData;
      } else if (isXmlContentType(contentType)) {
        // Mesh-specific: JSONSelection → FXP object → XML (SOAP is just document shape).
        const bodyValue = evaluateConnectBodySelection(connectArgs.http?.body, vars, {
          schema,
          field,
        });
        if (bodyValue !== undefined) {
          requestBody = jsObjectToXml(bodyValue);
          requestInit.body = requestBody;
        }
      } else {
        const bodyJson = buildBody(connectArgs.http?.body, vars, {
          schema,
          field,
          odataOpenTypes: isODataMetadataAccept(headers),
        });
        if (bodyJson != null) {
          if (contentType?.includes('application/x-www-form-urlencoded')) {
            try {
              requestBody = qsStringify(JSON.parse(bodyJson), {
                ...defaultQsOptions,
                ...queryStringOptions,
              });
            } catch {
              requestBody = bodyJson;
            }
          } else if (contentType?.startsWith('text/')) {
            // text/plain (and other text/*): send the raw scalar, not a JSON-encoded string
            // (text/xml is handled above via isXmlContentType).
            try {
              const parsed = JSON.parse(bodyJson);
              requestBody = typeof parsed === 'string' ? parsed : bodyJson;
            } catch {
              requestBody = bodyJson;
            }
          } else {
            requestBody = bodyJson;
            if (!contentType) {
              headers['content-type'] = 'application/json';
            }
          }
          requestInit.body = requestBody;
        }
      }
    }

    const fetchFn: MeshFetch = odataBatchFetch
      ? (odataBatchFetch as MeshFetch)
      : context?.fetch || opts.globalFetch || defaultFetch;
    const operationLogger =
      log.child?.({ operation: `${info.parentType.name}.${info.fieldName}` }) || log;
    operationLogger.debug?.(`Connect ${method} ${fullPath}`);

    const response = await fetchFn(fullPath, requestInit, context, info as any);
    const returnNamedGraphQLType = getNamedType(field.type);
    let responseData: any;
    const text = await response.text();
    const responseHeaderMap = getHeadersObj(response.headers);
    const selectionExtras: ConnectSelectionExtras = {
      status: response.status,
      responseHeaders: response.headers,
    };
    // Mesh OpenAPI status unions put `$status` in selection; treat as success so mapping runs.
    const handlesStatus = connectArgs.selection?.includes('$status');
    const serviceName =
      connectArgs.source ||
      source?.name ||
      (schema.extensions as any)?.apolloServiceName ||
      'connectors';
    const connectorCoordinate = `${serviceName}:${info.parentType.name}.${info.fieldName}@connect[0]`;

    const buildConnectorError = (body: any, parseError?: unknown) => {
      const errorsConfig = connectArgs.errors || source?.errors || source?.http?.errors;
      const customMessage = evalMappingExpression(errorsConfig?.message, body, selectionExtras);
      const customExtensionsRaw = evalMappingExpression(
        errorsConfig?.extensions,
        body,
        selectionExtras,
      );
      const mappedExtensions =
        customExtensionsRaw &&
        typeof customExtensionsRaw === 'object' &&
        !Array.isArray(customExtensionsRaw)
          ? (customExtensionsRaw as Record<string, unknown>)
          : {};
      const mappedConnector = mappedExtensions.connector;
      // Match httpOperation: expose the unresolved path template (Mesh `{args.x}` form).
      const pathForMessage = picked.path.replace(/\{\$/g, '{');
      const defaultMessage = `Upstream HTTP Error: ${response.status}, Could not invoke operation ${method} ${pathForMessage}`;
      // Spread mapped `@connect(errors.extensions:)` first, then overwrite Mesh
      // defaults. Do not invent `http.status` here — Yoga would promote it to the
      // gateway HTTP status — but keep it if the mapping set it explicitly.
      return new GraphQLError(
        typeof customMessage === 'string' && customMessage.length ? customMessage : defaultMessage,
        {
          extensions: {
            ...mappedExtensions,
            connector: {
              coordinate: connectorCoordinate,
              ...(mappedConnector &&
              typeof mappedConnector === 'object' &&
              !Array.isArray(mappedConnector)
                ? (mappedConnector as Record<string, unknown>)
                : {}),
            },
            code: mappedExtensions.code ?? 'CONNECTOR_FETCH',
            serviceName: mappedExtensions.serviceName ?? serviceName,
            // Mesh OpenAPI tests still assert extensions.request.url
            request: {
              url: requestUrlForMeta.href,
              method,
            },
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: getHeadersObj(response.headers),
              body,
            },
            ...(parseError ? { originalError: parseError } : {}),
          },
        },
      );
    };

    const evaluateIsSuccess = (body: any): boolean => {
      const isSuccessExpr = connectArgs.isSuccess ?? source?.isSuccess ?? source?.http?.isSuccess;
      if (isSuccessExpr != null && String(isSuccessExpr).trim() !== '') {
        return Boolean(evalMappingExpression(String(isSuccessExpr), body, selectionExtras));
      }
      if (handlesStatus) {
        return true;
      }
      return response.status.toString().startsWith('2');
    };

    const responseContentType = response.headers.get('content-type');

    if (!text) {
      // Preserve legacy Mesh behavior for empty / 204 responses (e.g. String fields → "")
      responseData = isScalarType(returnNamedGraphQLType) ? '' : {};
    } else if (isXmlContentType(responseContentType)) {
      try {
        responseData = xmlToJsObject(text);
      } catch (error) {
        if (isScalarType(returnNamedGraphQLType)) {
          responseData = text;
        } else {
          throw buildConnectorError(text, error);
        }
      }
    } else {
      try {
        responseData = JSON.parse(text);
      } catch (error) {
        // Some SOAP/XML servers omit Content-Type; fall back when the body looks like XML.
        if (looksLikeXml(text)) {
          try {
            responseData = xmlToJsObject(text);
          } catch (xmlError) {
            if (isScalarType(returnNamedGraphQLType)) {
              responseData = text;
            } else {
              throw buildConnectorError(text, xmlError);
            }
          }
        } else if (isScalarType(returnNamedGraphQLType)) {
          responseData = text;
        } else if (response.status === 204 || (response.status === 200 && text === '')) {
          responseData = {};
        } else if (!evaluateIsSuccess(text)) {
          throw buildConnectorError(text, error);
        } else if (
          response.status.toString().startsWith('2') &&
          !isScalarType(returnNamedGraphQLType)
        ) {
          // Successful status but non-JSON body for object/list fields — still a fetch failure.
          throw buildConnectorError(text, error);
        } else {
          responseData = text;
        }
      }
    }

    if (!evaluateIsSuccess(responseData)) {
      throw buildConnectorError(responseData);
    }

    const selectionText = connectArgs.selection || '$';
    let selected = markSelectionApplied(
      applySelection(selectionText, responseData, selectionExtras),
      selectionText,
    );
    // Normalize after selection so mappings like `$.products { id }` (object → array) work.
    const isListReturnType = isListTypeOrNonNullListType(field.type);
    if (isListReturnType && !Array.isArray(selected)) {
      selected = [selected];
    } else if (!isListReturnType && Array.isArray(selected)) {
      selected = selected[0];
    }
    // OData only: keep `@odata.*` and fill `_odataId` when metadata=minimal omits id.
    if (isODataMetadataAccept(headers)) {
      selected = preserveODataEntityMetadata(selected, responseData);
      selected = ensureODataIdField(selected, responseData, requestUrlForMeta.originPath);
      // Re-attach `$expand`ed nav so child `@connect` can prefer embedded (expandNavProps).
      // Raw attach skips keys already present from selection (those stay marked).
      if (expandNavProps && info) {
        selected = attachExpandedNavFromRaw(selected, responseData, info, expandNavProps);
      }
    }
    // Scalar / enum returns: unwrap attributed XML leaves, then coerce by type
    // so ID/String keep lexical text (`true`, `00123`). List returns coerce each
    // item — connector resolvers skip installXmlListPluralization.
    if (isScalarType(returnNamedGraphQLType) || isEnumType(returnNamedGraphQLType)) {
      const leafName = returnNamedGraphQLType.name;
      if (isListReturnType && Array.isArray(selected)) {
        selected = selected.map(item =>
          coerceXmlLeafForGraphQLType(unwrapXmlScalarLeaf(item), leafName),
        );
      } else if (!isListReturnType) {
        selected = coerceXmlLeafForGraphQLType(unwrapXmlScalarLeaf(selected), leafName);
      }
    }
    // Fill Mesh-only `_response` fields Apollo selection cannot express.
    selected = fillExposeResponseMetadata(selected, {
      url: requestUrlForMeta.originPath,
      method,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaderMap,
      body: responseData,
    });
    // Inherit parent `$request.path` so nested OpenAPI links keep the same path
    // args as the request that produced the parent (Mesh linkResolver semantics).
    const pathArgs: Record<string, any> = { ...args };
    const parentPath = root?.$request?.path;
    if (parentPath && typeof parentPath === 'object') {
      // Include Proxy-only keys (pathless resources expose path params via object fallback).
      for (const rawKey of Object.keys(parentPath)) {
        const key = String(rawKey);
        if (key.startsWith('$')) continue;
        const value = parentPath[key];
        if (pathArgs[key] == null && value != null && typeof value !== 'object') {
          pathArgs[key] = value;
        }
      }
    }
    return attachResponseMetadata(selected, {
      // Mesh `$url` historically excluded the query string (path/base only).
      url: requestUrlForMeta.originPath,
      method,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaderMap,
      requestHeaders: headers,
      args: pathArgs,
      requestBody,
      responseData,
      query: requestUrlForMeta.query,
    });
  };
}

/**
 * Complete Mesh `exposeResponseMetadata` `_response` after Apollo-portable selection
 * (`method: $("GET") status: $status body: $`). Adds url / statusText / headers map.
 */
function fillExposeResponseMetadata(
  selected: any,
  meta: {
    url: string;
    method: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
  },
): any {
  const fill = (obj: any) => {
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }
    if (
      obj._response == null ||
      typeof obj._response !== 'object' ||
      Array.isArray(obj._response)
    ) {
      return obj;
    }
    obj._response = {
      ...obj._response,
      url: meta.url,
      method: obj._response.method ?? meta.method,
      status: obj._response.status ?? meta.status,
      statusText: meta.statusText,
      headers: meta.headers,
      body: obj._response.body ?? meta.body,
    };
    return obj;
  };
  if (Array.isArray(selected)) {
    return selected.map(fill);
  }
  return fill(selected);
}

/**
 * Attach Mesh-compatible `$url` / `$request` / `$response` metadata used by link
 * interpolations. Hidden from enumerations / JSON. `_response` for
 * `exposeResponseMetadata` is baked into `@connect(selection:)` instead.
 */
function attachResponseMetadata(
  selected: any,
  meta: {
    url: string;
    method: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    requestHeaders: Record<string, string>;
    args: Record<string, any>;
    requestBody?: any;
    responseData: any;
    query?: Record<string, string>;
  },
): any {
  const pathWithObjectFallback = (obj: any) => {
    const args = meta.args || {};
    const read = (prop: string) => args[prop] ?? args.input?.[prop] ?? obj?.[prop];
    return new Proxy(args, {
      get(_, prop) {
        if (typeof prop !== 'string') return undefined;
        return read(prop);
      },
      has(_, prop) {
        if (typeof prop !== 'string') return false;
        return (
          prop in args || (args.input != null && prop in args.input) || (obj != null && prop in obj)
        );
      },
      // So Object.keys / inheritance see pathless fallbacks like `username` on the resource.
      ownKeys(): Array<string | symbol> {
        const keys = new Set<string>();
        for (const rawKey of Object.keys(args)) {
          keys.add(String(rawKey));
        }
        if (args.input && typeof args.input === 'object') {
          for (const rawKey of Object.keys(args.input)) {
            keys.add(String(rawKey));
          }
        }
        if (obj && typeof obj === 'object') {
          for (const rawKey of Object.keys(obj)) {
            const key = String(rawKey);
            if (key.startsWith('$')) continue;
            const value = obj[key];
            // Only scalar-ish fields are meaningful as path params
            if (value == null || typeof value === 'object') continue;
            keys.add(key);
          }
        }
        return Array.from(keys);
      },
      getOwnPropertyDescriptor(target, prop) {
        if (typeof prop !== 'string') return undefined;
        if (!(prop in target) && read(prop) === undefined) return undefined;
        return {
          enumerable: true,
          configurable: true,
          writable: false,
          value: read(prop),
        };
      },
    });
  };

  const decorate = (obj: any) => {
    if (obj == null || typeof obj !== 'object') {
      return obj;
    }
    const requestQuery = meta.query || {};
    // Object.defineProperties defaults enumerable:false — keep Mesh `$…` metadata
    // off JSON / Object.keys (OpenAPI "arbitrary JSON" / no _openAPIToGraphQL).
    Object.defineProperties(obj, {
      $url: {
        get() {
          return meta.url;
        },
      },
      $method: {
        get() {
          return meta.method;
        },
      },
      $statusCode: {
        get() {
          return meta.status;
        },
      },
      $statusText: {
        get() {
          return meta.statusText;
        },
      },
      $headers: {
        get() {
          return meta.requestHeaders;
        },
      },
      $request: {
        get() {
          return {
            query: requestQuery,
            // Pathless OpenAPI links use `$request.path.username` where username
            // lives on the parent resource object, not the list query args.
            path: pathWithObjectFallback(obj),
            header: meta.requestHeaders,
            body: meta.requestBody ?? meta.args?.input,
          };
        },
      },
      $response: {
        get() {
          return {
            header: meta.headers,
            body: meta.responseData,
            query: requestQuery,
            path: pathWithObjectFallback(obj),
          };
        },
      },
    });
    return obj;
  };
  if (Array.isArray(selected)) {
    return selected.map(decorate);
  }
  return decorate(selected);
}

export function processConnectDirectives(
  schema: GraphQLSchema,
  opts: ConnectFieldResolverOptions = {},
) {
  const odata = opts.odata;
  const batchMode = odata?.batch;
  const batchEndpoint = (() => {
    const sources = getSourceMap(schema);
    for (const source of sources.values()) {
      if (typeof source?.http?.baseURL === 'string') {
        return source.http.baseURL;
      }
    }
    return undefined;
  })();
  // Single factory for the whole schema — per-field factories would not coalesce.
  const batchFetch =
    odata?.batchFetch ||
    (batchMode && batchMode !== 'none' && batchEndpoint
      ? createODataBatchFetch({
          fetchFn: (url, init, ctx, inf) =>
            (ctx?.fetch || opts.globalFetch || defaultFetch)(url, init, ctx, inf) as any,
          endpoint: batchEndpoint,
          batchMode,
          securityHeaderNames: odata?.securityHeaderNames,
        })
      : undefined);
  const fieldOpts: ConnectFieldResolverOptions = {
    ...opts,
    odata: odata || batchFetch ? { ...odata, batchFetch } : undefined,
  };

  const queryType = schema.getQueryType();
  const typeMap = schema.getTypeMap();
  for (const typeName in typeMap) {
    const type = typeMap[typeName];
    // Type-level `@connect` / `@join__directive(name: "connect")` → resolveReference.
    const typeDirectives = getConnectArgsFromNode(type as any);
    if (typeDirectives?.length) {
      const connectArgs = typeDirectives[0];
      const syntheticField = {
        name: '__resolveReference',
        type: type as any,
        args: [],
        extensions: {},
      } as unknown as GraphQLField<any, any>;
      addConnectFieldResolver(schema, syntheticField, connectArgs, fieldOpts);
      const resolve = syntheticField.resolve;
      if (resolve) {
        setTypeResolveReference(type, (reference, context, info) =>
          resolve(reference, {}, context, info),
        );
      }
    }
    if (!('getFields' in type)) continue;
    const fields = type.getFields();
    for (const fieldName in fields) {
      const field = fields[fieldName];
      const directives = getConnectArgsFromNode(field as any);
      if (!directives?.length) continue;
      // First connect wins for execution (repeatable for schema merge cases)
      const connectArgs = directives[0];
      addConnectFieldResolver(schema, field as GraphQLField<any, any>, connectArgs, fieldOpts);
      // Query `@connect(entity: true)` → type.resolveReference (Federation `_entities`).
      if (connectArgs.entity && type === queryType && isObjectType(getNamedType(field.type))) {
        const returnType = getNamedType(field.type) as GraphQLObjectType;
        if (!getTypeResolveReference(returnType)) {
          const entityField = field as GraphQLField<any, any>;
          setTypeResolveReference(returnType, (reference, context, info) => {
            const args: Record<string, any> = {};
            for (const arg of entityField.args) {
              args[arg.name] = reference?.[arg.name];
            }
            return entityField.resolve?.(null, args, context, info);
          });
        }
      }
    }
  }
  // Hive stitches `@key` entities via `Query._entities`. Apollo Router uses `@connect`
  // natively and never calls this field — but without it Hive needed Mesh `@merge`.
  ensureFederationEntitiesField(schema);
  // Same-subgraph Connectors stubs (`customer: { id: customerId }`) leave a partial
  // object in Hive — unlike Router, the gateway won't auto `_entities` for missing
  // fields on that object. Fill them via `resolveReference` when a field is absent.
  hydrateEntityStubFieldResolvers(schema);
  return schema;
}

const MESH_ENTITY_FILL = Symbol.for('mesh.connectors.entityFill');

/**
 * For types with `resolveReference`, resolve missing fields by fetching the entity
 * once per parent object (deduped). Lets Hive honor entity stubs the way Router does.
 */
function hydrateEntityStubFieldResolvers(schema: GraphQLSchema) {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) {
      continue;
    }
    const resolveReference = getTypeResolveReference(type);
    if (!resolveReference) {
      continue;
    }
    const fields = type.getFields();
    for (const fieldName of Object.keys(fields)) {
      const field = fields[fieldName] as GraphQLField<any, any>;
      if (typeof field.resolve === 'function') {
        continue;
      }
      field.resolve = (parent, _args, context, info) => {
        if (parent == null || typeof parent !== 'object') {
          return parent?.[fieldName];
        }
        if (Object.prototype.hasOwnProperty.call(parent, fieldName)) {
          return parent[fieldName];
        }
        let fill = (parent as any)[MESH_ENTITY_FILL];
        if (!fill) {
          // fakePromise: sync resolveReference avoids an extra microtask tick.
          fill = fakePromise(resolveReference(parent, context, info)).then((full: any) => {
            if (full && typeof full === 'object') {
              Object.assign(parent, full);
            }
            return parent;
          });
          (parent as any)[MESH_ENTITY_FILL] = fill;
        }
        return fakePromise(fill).then(() => parent[fieldName]);
      };
    }
  }
}

/**
 * Add / repair Federation `Query._entities`.
 *
 * Dispatch is `@apollo/subgraph`'s `entitiesResolver` (same as the legacy federation
 * transform) — we only own the Connectors → `resolveReference` wiring and the Hive
 * bare-field repair. `@apollo/subgraph` >= 2.15 no longer exports `_Any` / `_Entity`,
 * so those GraphQL types stay local when we have to create the field from scratch.
 *
 * Hive Gateway extracts subgraph schemas from the supergraph SDL — those already
 * carry a bare `Query._entities` for `@key` types, with no resolver. Skipping when
 * the field exists left defaultFieldResolver returning null →
 * `Cannot return null for non-nullable field Query._entities` (DOWNSTREAM_SERVICE_ERROR)
 * whenever Hive planned `_entities` against a Connectors REST subgraph (e.g. OData
 * owner + GraphQL/Connectors stub). Always install the resolveReference dispatcher.
 */
function ensureFederationEntitiesField(schema: GraphQLSchema) {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return;
  }
  const queryFields = queryType.getFields();
  const entityTypes = Object.values(schema.getTypeMap()).filter(
    (t): t is GraphQLObjectType =>
      isObjectType(t) && !t.name.startsWith('__') && !!getTypeResolveReference(t),
  );
  if (!entityTypes.length) {
    return;
  }

  const typeMap = schema.getTypeMap() as Record<string, any>;
  let anyType = typeMap._Any as GraphQLScalarType | undefined;
  if (!anyType) {
    // Federation `_Any` — representations arrive as variables (parseValue), not literals.
    anyType = new GraphQLScalarType({
      name: '_Any',
      serialize: value => value,
      parseValue: value => value,
    });
    typeMap._Any = anyType;
  }

  let entityUnion = typeMap._Entity as GraphQLUnionType | undefined;
  if (!entityUnion) {
    entityUnion = new GraphQLUnionType({
      name: '_Entity',
      types: entityTypes,
      resolveType(obj) {
        return obj?.__typename || undefined;
      },
    });
    typeMap._Entity = entityUnion;
  }

  const entitiesResolve = (
    _root: unknown,
    args: { representations?: unknown },
    context: any,
    info: GraphQLResolveInfo,
  ) => {
    const representations = args?.representations;
    if (!Array.isArray(representations)) {
      return [];
    }
    return entitiesResolver({ representations, context, info });
  };

  if (queryFields._entities) {
    // Federation-extracted subgraph: field exists, resolver does not — wire it.
    queryFields._entities.resolve = entitiesResolve;
    return;
  }

  queryFields._entities = {
    name: '_entities',
    description: 'Federation entity resolver for Connectors REST transport (Hive `_entities` path)',
    type: new GraphQLNonNull(new GraphQLList(entityUnion)),
    args: [
      {
        name: 'representations',
        description: undefined,
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(anyType))),
        defaultValue: undefined,
        deprecationReason: undefined,
        extensions: {},
        astNode: undefined,
      },
    ],
    resolve: entitiesResolve,
    subscribe: undefined,
    deprecationReason: undefined,
    extensions: {},
    astNode: undefined,
  };
}
