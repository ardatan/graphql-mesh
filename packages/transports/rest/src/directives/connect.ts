import {
  getNamedType,
  GraphQLError,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLUnionType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  type GraphQLField,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
} from 'graphql';
import type { IStringifyOptions } from 'qs';
import { stringify as qsStringify } from 'qs';
import urlJoin from 'url-join';
import { Logger, type Logger as HiveLogger } from '@graphql-hive/logger';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { MeshFetch, MeshFetchRequestInit } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { getDirectiveExtensions, memoize1 } from '@graphql-tools/utils';
import { Blob, fetch as defaultFetch, File, FormData } from '@whatwg-node/fetch';
import { fakePromise } from '@whatwg-node/promise-helpers';
import { isFileUpload } from './isFileUpload.js';
import { resolveDataByUnionInputType } from './resolveDataByUnionInputType.js';
import { serializeArgumentsForInterpolation } from './utils.js';

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

function getConnectArgsFromNode(node: {
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
function resolveTemplate(
  template: string,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
    config?: Record<string, any>;
  },
  options: { encodeValues?: boolean } = {},
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
  resolved = resolved.replace(/\{\$([^{}]+)\}/g, (full, expr: string) => {
    if (!expr.includes('->') && !expr.includes('[')) {
      return full;
    }
    const value = evalConnectorsVarExpr(`$${expr}`, vars);
    if (value == null || value === '') {
      return '';
    }
    return options.encodeValues ? encodeURIComponent(String(value)) : String(value);
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
  return meshForm.replace(/\{([^{}]+)\}/g, (_match, path: string) => {
    const value = stringInterpolator.parse(`{${path}}`, interpolateArgs);
    if (value == null || value === '') {
      return '';
    }
    return encodeURIComponent(String(value));
  });
}

/**
 * Evaluate `$args.x->match(...)` / `$this["key"]` style Connectors variable expressions.
 */
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

const defaultQsOptions: IStringifyOptions = {
  indices: false,
};

/**
 * Minimal queryParams mapping.
 * Supports:
 * - object literal: `{ "foo:bar": $args.foo_bar, limit: $args.limit }`
 * - line form: `limit: $args.limit`
 * Null values are omitted. Array/object encoding follows Hive qs options.
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
  queryStringOptionsByParam?: Record<string, MeshQsOptions & { destructObject?: boolean }>,
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
    const paramOpts = queryStringOptionsByParam?.[key] as
      (MeshQsOptions & { destructObject?: boolean; deepObject?: boolean }) | undefined;
    if (paramOpts?.destructObject && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedVal] of Object.entries(value)) {
        if (nestedVal == null) continue;
        // OpenAPI `style: deepObject` → `filter[name]=…` (Apollo queryParams form).
        if (paramOpts.deepObject) {
          params[`${key}[${nestedKey}]`] = nestedVal;
        } else {
          params[nestedKey] = nestedVal;
        }
      }
      continue;
    }
    params[key] = value;
  }
  if (!Object.keys(params).length) {
    return fullPath;
  }
  const { jsonStringify: globalJsonStringify, ...restQs } = qsOptions;
  const byParam = queryStringOptionsByParam || {};
  // Per-param `jsonStringify` overrides the global flag (Mesh httpOperation semantics).
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value == null || typeof value !== 'object') continue;
    const paramJson =
      byParam[key] && 'jsonStringify' in byParam[key]
        ? Boolean(byParam[key].jsonStringify)
        : Boolean(globalJsonStringify);
    if (paramJson) {
      params[key] = JSON.stringify(value);
    }
  }
  // Serialize per-param when options differ; otherwise one qs pass.
  const hasPerParam = Object.keys(byParam).some(k => k in params);
  let serialized: string;
  if (hasPerParam) {
    const parts: string[] = [];
    for (const key of Object.keys(params)) {
      const {
        destructObject: _d,
        deepObject: _deep,
        jsonStringify: _j,
        ...paramQs
      } = (byParam[key] || {}) as MeshQsOptions & {
        destructObject?: boolean;
        deepObject?: boolean;
        jsonStringify?: boolean;
      };
      parts.push(
        qsStringify(
          { [key]: params[key] },
          {
            ...defaultQsOptions,
            ...restQs,
            ...paramQs,
          },
        ),
      );
    }
    serialized = parts.filter(Boolean).join('&');
  } else {
    serialized = qsStringify(params, {
      ...defaultQsOptions,
      ...restQs,
    });
  }
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

/**
 * Minimal selection evaluator:
 * - `id name` field picks
 * - `alias: path` aliases
 * - nested `field { a b }`
 * - `$` / `$root` for root
 * - `$status`
 * - `$response.headers.x` (first value)
 */
export function applySelection(
  selection: string,
  root: any,
  extras: { status?: number; responseHeaders?: Headers },
): any {
  const trimmed = selection.trim();
  if (!trimmed) {
    return root;
  }
  if (trimmed === '$' || trimmed === '$root') {
    return root;
  }
  // Connectors literals / single path expressions (not multi-field selections).
  // `$status->match(...)` may contain spaces inside the argument list.
  if (trimmed.startsWith('$') && !trimmed.includes('\n') && !/^[A-Za-z_][\w]*\s*:/.test(trimmed)) {
    return evalPath(trimmed, root, extras);
  }
  return evalSubSelection(trimmed, root, extras);
}

function evalPath(
  path: string,
  root: any,
  extras: { status?: number; responseHeaders?: Headers },
): any {
  if (path === '$' || path === '$root') return root;
  if (path === '$status') return extras.status;
  if (path.startsWith('$response.headers.')) {
    const name = path.slice('$response.headers.'.length).replace(/^['"]|['"]$/g, '');
    const values = extras.responseHeaders?.get(name);
    return values;
  }
  if (path.startsWith('$(') && path.endsWith(')')) {
    try {
      return JSON.parse(path.slice(2, -1));
    } catch {
      return path.slice(2, -1);
    }
  }
  // Method calls: `$status->match(...)`, `$->map(@->match(...))`, `$["a"]->first`
  const methodMatch = path.match(/^(.*?)->([A-Za-z_][\w]*)\((.*)\)$/);
  if (methodMatch) {
    const left = evalPath(methodMatch[1].trim(), root, extras);
    const method = methodMatch[2];
    const rawArgs = methodMatch[3].trim();
    if (method === 'first') {
      return Array.isArray(left) ? left[0] : left;
    }
    if (method === 'match') {
      return evalMatchMethod(left, rawArgs, root, extras);
    }
    if (method === 'get') {
      return evalGetMethod(left, rawArgs);
    }
    // `$->map(@->match(...))` / `$->map(@.id)` — Apollo list element transform.
    if (method === 'map') {
      if (!Array.isArray(left)) return left;
      const elementExpr = rawArgs.trim();
      return left.map(item => {
        if (elementExpr === '@') return item;
        // `@->match(...)` / `@->first` — treat `@` as the element root.
        if (elementExpr.startsWith('@')) {
          const rewritten = elementExpr.replace(/^@/, '$');
          return evalPath(rewritten, item, extras);
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
 * Federation Connectors `$->get("key")` / `$args->get("special-key")` / `arr->get(0)`.
 * Preferred over `$["key"]` which Apollo Router's selection parser rejects with Eof.
 */
function evalGetMethod(left: any, rawArgs: string): any {
  if (left == null) return undefined;
  const trimmed = rawArgs.trim();
  try {
    return left[JSON.parse(trimmed)];
  } catch {
    const quoted = trimmed.match(/^["'](.*)["']$/);
    if (quoted) return left[quoted[1]];
    if (/^-?\d+$/.test(trimmed)) return left[Number(trimmed)];
    return left[trimmed];
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
  extras: { status?: number; responseHeaders?: Headers } = {},
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
  extras: { status?: number; responseHeaders?: Headers } = {},
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
  extras: { status?: number; responseHeaders?: Headers },
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

function evalSubSelection(
  selection: string,
  root: any,
  extras: { status?: number; responseHeaders?: Headers },
): any {
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
  // `$("literal")` / `$('literal')` Connectors string/number literals.
  if (s[i] === '$') {
    i++;
    // `$("…")` / `$('…')` / `$(123)` / `$(true)` — consume before path segments.
    if (s[i] === '(') {
      i++;
      if (s[i] === '"' || s[i] === "'") {
        const quote = s[i++];
        while (i < s.length && s[i] !== quote) {
          if (s[i] === '\\' && i + 1 < s.length) i += 2;
          else i++;
        }
        if (s[i] === quote) i++;
      } else {
        while (i < s.length && s[i] !== ')') i++;
      }
      if (s[i] === ')') i++;
      return { value: s.slice(start, i), end: i };
    }
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
  } = {},
): string | undefined {
  if (!bodySelection) return undefined;
  const trimmed = bodySelection.trim();

  const recoverInput = (value: any, argName: string) => {
    if (value == null || !opts.schema || !opts.field) {
      return value;
    }
    const argDef = opts.field.args?.find(arg => arg.name === argName);
    if (!argDef) {
      return value;
    }
    return resolveDataByUnionInputType(
      value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value,
      argDef.type,
      opts.schema,
    );
  };

  if (trimmed === '$args') {
    return JSON.stringify(vars.args);
  }
  if (trimmed === '$args.input' || trimmed.startsWith('$args.input')) {
    let input = recoverInput(vars.args.input, 'input');
    // Merge Mesh `requestBaseBody` under the GraphQL `input` arg when both exist.
    const baseBody = parseObjMapArg(
      (opts.field?.extensions as any)?.meshRestOptions?.requestBaseBody,
    );
    if (baseBody != null && typeof baseBody === 'object' && !Array.isArray(baseBody)) {
      input =
        input != null && typeof input === 'object' && !Array.isArray(input)
          ? { ...baseBody, ...input }
          : { ...baseBody };
    }
    // `$args.input { alias: field }` subselection
    const subMatch = trimmed.match(/^\$args\.input\s*\{([\s\S]*)\}$/);
    if (subMatch) {
      return JSON.stringify(applySelection(subMatch[1], input, {}));
    }
    if (trimmed === '$args.input') {
      return JSON.stringify(input);
    }
  }
  if (trimmed.startsWith('$args.')) {
    const pathMatch = trimmed.match(/^\$args\.(\w+)(\s*\{([\s\S]*)\})?$/);
    if (pathMatch) {
      const value = recoverInput(vars.args[pathMatch[1]], pathMatch[1]);
      if (pathMatch[3] != null) {
        return JSON.stringify(applySelection(pathMatch[3], value, {}));
      }
      return JSON.stringify(value);
    }
  }
  if (trimmed.startsWith('$({') && trimmed.endsWith('})')) {
    try {
      return JSON.stringify(JSON.parse(trimmed.slice(2, -1)));
    } catch {
      /* fall through */
    }
  }
  try {
    return JSON.stringify(applySelection(trimmed.replace(/^\$args\s*/, ''), vars.args, {}));
  } catch {
    return JSON.stringify(vars.args);
  }
}

export function addConnectFieldResolver(
  schema: GraphQLSchema,
  field: GraphQLField<any, any>,
  connectArgs: ConnectArgs,
  opts: {
    globalFetch?: MeshFetch;
    log?: HiveLogger;
    timeout?: number;
    queryStringOptions?: MeshQsOptions;
  } = {},
) {
  const log = opts.log || new Logger({ prefix: 'connect' });
  const sources = getSourceMap(schema);
  const source = connectArgs.source ? sources.get(connectArgs.source) : undefined;
  const picked = pickHttp(connectArgs.http);
  const schemaMeshRestOptions = (schema.extensions as any)?.meshRestOptions || {};
  const rawFieldMeshRestOptions = (field.extensions as any)?.meshRestOptions || {};
  // ObjMap args may still be JSON strings if hydrate did not run (direct processConnect).
  const fieldMeshRestOptions = {
    ...rawFieldMeshRestOptions,
    queryStringOptions: parseObjMapArg(rawFieldMeshRestOptions.queryStringOptions),
    queryStringOptionsByParam: parseObjMapArg(rawFieldMeshRestOptions.queryStringOptionsByParam),
    requestBaseBody: parseObjMapArg(rawFieldMeshRestOptions.requestBaseBody),
  } as Record<string, any>;
  // Operation/field meshRestOptions override serve-time globals (httpOperation parity).
  const queryStringOptions: MeshQsOptions = {
    ...opts.queryStringOptions,
    ...(parseObjMapArg(schemaMeshRestOptions.queryStringOptions) as MeshQsOptions),
    ...(fieldMeshRestOptions.queryStringOptions as MeshQsOptions),
  };
  const queryStringOptionsByParam =
    fieldMeshRestOptions.queryStringOptionsByParam ||
    parseObjMapArg(schemaMeshRestOptions.queryStringOptionsByParam);
  const timeout = opts.timeout ?? fieldMeshRestOptions.timeout ?? schemaMeshRestOptions.timeout;

  field.resolve = async (root, args, context, info: GraphQLResolveInfo) => {
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
      // `$this` is the parent object; `$args` are field args. Evaluate via var exprs when
      // present so `$this["TLSv1.3"]` works (Apollo virtual-connector rename pattern).
      if (selection.includes('$args') || selection.includes('$this')) {
        return evalConnectorsVarExpr(selection.trim(), {
          args: args || {},
          thisValue: root,
          env: process.env,
          context: context || {},
          config: {},
        });
      }
      return applySelection(selection, root || {}, {});
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
    // Path templates percent-encode expression values; baseURL / headers do not.
    const path = resolveTemplate(picked.path, vars, { encodeValues: true });
    // Match Mesh httpOperation (`urlJoin(base, path)`): empty base keeps relative paths
    // so test mocks like `fetch('pets/1')` keep working.
    let fullPath = urlJoin(baseURL || '', path) || path;

    const resolveArg = (argName: string, value: any) => {
      const argDef = field.args?.find(arg => arg.name === argName);
      if (!argDef || value == null || typeof value !== 'object') {
        return value;
      }
      return resolveDataByUnionInputType(JSON.parse(JSON.stringify(value)), argDef.type, schema);
    };
    fullPath = applyQueryParams(
      fullPath,
      source?.http?.queryParams,
      vars,
      queryStringOptions,
      queryStringOptionsByParam,
      resolveArg,
    );
    fullPath = applyQueryParams(
      fullPath,
      connectArgs.http?.queryParams,
      vars,
      queryStringOptions,
      queryStringOptionsByParam,
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
      // Raw binary upload (Mesh `binary: true` → `@meshRestOptions(isBinary: true)`).
      if (fieldMeshRestOptions.isBinary) {
        const binaryUpload = await rawArgs.input;
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
      } else {
        const bodyJson = buildBody(connectArgs.http?.body, vars, { schema, field });
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

    const fetchFn: MeshFetch = context?.fetch || opts.globalFetch || defaultFetch;
    const operationLogger =
      log.child?.({ operation: `${info.parentType.name}.${info.fieldName}` }) || log;
    operationLogger.debug?.(`Connect ${method} ${fullPath}`);

    const response = await fetchFn(fullPath, requestInit, context, info as any);
    const returnNamedGraphQLType = getNamedType(field.type);
    let responseData: any;
    const text = await response.text();
    const selectionExtras = {
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
            serviceName:
              (typeof mappedExtensions.serviceName === 'string' && mappedExtensions.serviceName) ||
              serviceName,
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
            headers: getHeadersObj(response.headers),
            responseJson: body,
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

    if (!text) {
      // Preserve legacy Mesh behavior for empty / 204 responses (e.g. String fields → "")
      responseData = isScalarType(returnNamedGraphQLType) ? '' : {};
    } else {
      try {
        responseData = JSON.parse(text);
      } catch (error) {
        if (isScalarType(returnNamedGraphQLType)) {
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

    let selected = applySelection(connectArgs.selection || '$', responseData, selectionExtras);
    // Normalize after selection so mappings like `$.products { id }` (object → array) work.
    const isListReturnType = isListTypeOrNonNullListType(field.type);
    if (isListReturnType && !Array.isArray(selected)) {
      selected = [selected];
    } else if (!isListReturnType && Array.isArray(selected)) {
      selected = selected[0];
    }
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
      headers: getHeadersObj(response.headers),
      requestHeaders: headers,
      args: pathArgs,
      requestBody,
      responseData,
      query: requestUrlForMeta.query,
    });
  };
}

/**
 * Attach Mesh-compatible `$url` / `$request` / `$response` metadata used by link
 * interpolations and `@responseMetadata`. Hidden from enumerations / JSON.
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

function parseObjMapArg(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Restore Mesh-only `@meshRestOptions` into `field.extensions.meshRestOptions`.
 * ObjMap directive args are often JSON strings after SDL round-trip.
 */
function hydrateMeshRestOptionsFromDirective(field: GraphQLField<any, any>) {
  const dirs = getDirectiveExtensions(field)?.meshRestOptions as
    Array<Record<string, any>> | undefined;
  const fromDirective = dirs?.[0];
  if (!fromDirective) {
    return;
  }
  const normalized: Record<string, any> = { ...fromDirective };
  for (const key of [
    'queryStringOptions',
    'queryStringOptionsByParam',
    'requestBaseBody',
  ] as const) {
    if (key in normalized) {
      normalized[key] = parseObjMapArg(normalized[key]);
    }
  }
  field.extensions = field.extensions || {};
  (field.extensions as any).meshRestOptions = {
    ...((field.extensions as any).meshRestOptions || {}),
    ...normalized,
  };
}

export function processConnectDirectives(
  schema: GraphQLSchema,
  opts: {
    globalFetch?: MeshFetch;
    log?: HiveLogger;
    timeout?: number;
    queryStringOptions?: MeshQsOptions;
  } = {},
) {
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
      addConnectFieldResolver(schema, syntheticField, connectArgs, opts);
      const resolve = syntheticField.resolve;
      if (resolve) {
        (type as any).resolveReference = (reference: any, context: any, info: any) =>
          resolve(reference, {}, context, info);
      }
    }
    if (!('getFields' in type)) continue;
    const fields = type.getFields();
    for (const fieldName in fields) {
      const field = fields[fieldName];
      hydrateMeshRestOptionsFromDirective(field as GraphQLField<any, any>);
      const directives = getConnectArgsFromNode(field as any);
      if (!directives?.length) continue;
      // First connect wins for execution (repeatable for schema merge cases)
      const connectArgs = directives[0];
      addConnectFieldResolver(schema, field as GraphQLField<any, any>, connectArgs, opts);
      // Query `@connect(entity: true)` → type.resolveReference (Federation `_entities`).
      if (connectArgs.entity && type === queryType && isObjectType(getNamedType(field.type))) {
        const returnType = getNamedType(field.type) as GraphQLObjectType;
        if (typeof (returnType as any).resolveReference !== 'function') {
          const entityField = field as GraphQLField<any, any>;
          (returnType as any).resolveReference = (reference: any, context: any, info: any) => {
            const args: Record<string, any> = {};
            for (const arg of entityField.args) {
              args[arg.name] = reference?.[arg.name];
            }
            return entityField.resolve?.(null, args, context, info);
          };
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
    const resolveReference = (type as any).resolveReference;
    if (typeof resolveReference !== 'function') {
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
 * Add Federation `Query._entities` that dispatches to type `resolveReference`
 * (from type-level `@connect` or `entity: true`). Lets Hive Gateway resolve
 * entities without Mesh `@merge`.
 */
function ensureFederationEntitiesField(schema: GraphQLSchema) {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return;
  }
  const queryFields = queryType.getFields();
  if (queryFields._entities) {
    return;
  }
  const entityTypes = Object.values(schema.getTypeMap()).filter(
    (t): t is GraphQLObjectType =>
      isObjectType(t) &&
      !t.name.startsWith('__') &&
      typeof (t as any).resolveReference === 'function',
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
    resolve(_root, args, context, info) {
      const representations = args?.representations;
      if (!Array.isArray(representations)) {
        return [];
      }
      return representations.map(async (representation: any) => {
        const typeName = representation?.__typename;
        if (!typeName) {
          return representation;
        }
        const type = info.schema.getType(typeName);
        if (!isObjectType(type)) {
          return representation;
        }
        const resolveReference = (type as any).resolveReference;
        if (typeof resolveReference !== 'function') {
          return representation;
        }
        const resolved = await resolveReference(representation, context, info);
        // Preserve __typename for `_Entity.resolveType`.
        if (resolved && typeof resolved === 'object' && !resolved.__typename) {
          resolved.__typename = typeName;
        }
        return resolved ?? representation;
      });
    },
    subscribe: undefined,
    deprecationReason: undefined,
    extensions: {},
    astNode: undefined,
  };
}
