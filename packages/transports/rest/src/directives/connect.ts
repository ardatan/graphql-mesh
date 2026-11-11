import {
  getNamedType,
  GraphQLError,
  isListType,
  isNonNullType,
  isScalarType,
  type GraphQLField,
  type GraphQLOutputType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
} from 'graphql';
import type { IStringifyOptions } from 'qs';
import { stringify as qsStringify } from 'qs';
import { Logger, type Logger as HiveLogger } from '@graphql-hive/logger';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { MeshFetch } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { getDirectiveExtensions, memoize1 } from '@graphql-tools/utils';
import { Blob, File, FormData, fetch as defaultFetch } from '@whatwg-node/fetch';
import urlJoin from 'url-join';
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

function getSourceMap(schema: GraphQLSchema): Map<string, SourceArgs> {
  const sources = getDirectiveExtensions(schema)?.source as SourceArgs[] | undefined;
  const map = new Map<string, SourceArgs>();
  for (const source of sources || []) {
    if (source?.name) {
      map.set(source.name, source);
    }
  }
  return map;
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
  // Normalize Connectors `{$args.x|base64}` to Mesh `{args.x|base64}` so modifiers work.
  const meshForm = resolved.replace(/\{\$([a-zA-Z_][\w.|:]*)\}/g, (_, path: string) => {
    const normalized = path.replace(/^root\b/, 'this');
    return `{${normalized}}`;
  });
  const interpolated = stringInterpolator.parse(meshForm, {
    args: vars.args,
    context: vars.context,
    env: vars.env,
    root: vars.thisValue,
    this: vars.thisValue,
    config: vars.config,
  });
  return interpolated == null ? '' : String(interpolated);
}

function lookupVar(
  path: string,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
    config?: Record<string, any>;
  },
): any {
  const parts = path.split('.');
  const root = parts[0];
  let cur: any;
  switch (root) {
    case '$args':
      cur = vars.args;
      break;
    case '$this':
      cur = vars.thisValue;
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
  for (let i = 1; i < parts.length; i++) {
    if (cur == null) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
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
    const paramOpts = queryStringOptionsByParam?.[key];
    if (paramOpts?.destructObject && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedVal] of Object.entries(value)) {
        if (nestedVal != null) {
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
  const { jsonStringify, ...restQs } = qsOptions;
  if (jsonStringify) {
    for (const key of Object.keys(params)) {
      const value = params[key];
      if (value != null && typeof value === 'object') {
        params[key] = JSON.stringify(value);
      }
    }
  }
  // Serialize per-param when options differ; otherwise one qs pass.
  const byParam = queryStringOptionsByParam || {};
  const hasPerParam = Object.keys(byParam).some(k => k in params);
  let serialized: string;
  if (hasPerParam) {
    const parts: string[] = [];
    for (const key of Object.keys(params)) {
      const { destructObject: _d, jsonStringify: _j, ...paramQs } = byParam[key] || {};
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
  const body =
    trimmed.startsWith('{') && trimmed.endsWith('}')
      ? trimmed.slice(1, -1)
      : trimmed;
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
      // Match Mesh httpOperation: skip null/empty header values
      if (resolved != null && resolved !== '') {
        headers[mapping.name.toLowerCase()] = resolved;
      }
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
  // Path / literal expressions start with `$`. Plain field names are a subselection
  // (e.g. selection: "id" means `{ id }` over the response object or list).
  if (
    trimmed.startsWith('$') &&
    !trimmed.includes('\n') &&
    !trimmed.includes('{') &&
    !trimmed.includes(' ')
  ) {
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
  // Method calls: `$status->match(...)`, `$response.headers.x->first`
  const methodMatch = path.match(/^(.*?)->([A-Za-z_][\w]*)\((.*)\)$/);
  if (methodMatch) {
    const left = evalPath(methodMatch[1].trim(), root, extras);
    const method = methodMatch[2];
    const rawArgs = methodMatch[3].trim();
    if (method === 'first') {
      return Array.isArray(left) ? left[0] : left;
    }
    if (method === 'match') {
      return evalMatchMethod(left, rawArgs);
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
  const parts = path.replace(/^\$\.?/, '').split('.');
  let cur = root;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

/**
 * Apollo Connectors `$x->match([key, value], …, [@, default])`.
 */
function evalMatchMethod(left: any, rawArgs: string): any {
  // Split top-level `[...]` groups
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
    // [@, value] default arm
    if (inner.startsWith('@')) {
      const comma = inner.indexOf(',');
      fallback = parseMatchValue(comma >= 0 ? inner.slice(comma + 1).trim() : 'null');
      continue;
    }
    const comma = inner.indexOf(',');
    if (comma < 0) continue;
    const key = parseMatchValue(inner.slice(0, comma).trim());
    const value = parseMatchValue(inner.slice(comma + 1).trim());
    if (Object.is(key, left) || key === left) {
      return value;
    }
  }
  return fallback;
}

function parseMatchValue(raw: string): any {
  if (raw === '@') return undefined;
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
    if (token.sub) {
      const source = token.source === '$' ? root : evalPath(token.source, root, extras);
      result[token.alias] = evalSubSelection(token.sub, source, extras);
    } else {
      result[token.alias] = evalPath(token.source, root, extras);
    }
  }
  return result;
}

type SelectionToken = { alias: string; source: string; sub?: string };

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
  while (i < s.length && /[A-Za-z0-9_$.\-]/.test(s[i])) i++;
  return { value: s.slice(start, i), end: i };
}

function tokenizeSelection(selection: string): SelectionToken[] {
  const tokens: SelectionToken[] = [];
  let i = 0;
  const s = selection.trim();
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    // alias or field
    let read = readSelectionIdent(s, i);
    let name = read.value;
    i = read.end;
    while (i < s.length && /\s/.test(s[i])) i++;
    let alias = name;
    let source = name;
    if (s[i] === ':') {
      i++;
      while (i < s.length && /\s/.test(s[i])) i++;
      read = readSelectionIdent(s, i);
      source = read.value;
      i = read.end;
      alias = name;
      while (i < s.length && /\s/.test(s[i])) i++;
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
    const input = recoverInput(vars.args.input, 'input');
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
  const fieldMeshRestOptions = (field.extensions as any)?.meshRestOptions || {};
  const queryStringOptions: MeshQsOptions = {
    ...schemaMeshRestOptions.queryStringOptions,
    ...fieldMeshRestOptions.queryStringOptions,
    ...opts.queryStringOptions,
  };
  const queryStringOptionsByParam =
    fieldMeshRestOptions.queryStringOptionsByParam ||
    schemaMeshRestOptions.queryStringOptionsByParam;
  const timeout =
    opts.timeout ?? fieldMeshRestOptions.timeout ?? schemaMeshRestOptions.timeout;

  field.resolve = async (root, args, context, info: GraphQLResolveInfo) => {
    // Virtual connector: no http
    if (!picked) {
      const value = applySelection(connectArgs.selection || '$({})', {}, {});
      // Evaluate literal virtual selections against args/this
      if (connectArgs.selection?.includes('$args') || connectArgs.selection?.includes('$this')) {
        return applySelection(connectArgs.selection, { ...root, ...args }, {});
      }
      return value;
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
    const path = resolveTemplate(picked.path, vars);
    // Match Mesh httpOperation (`urlJoin(base, path)`): empty base keeps relative paths
    // so test mocks like `fetch('pets/1')` keep working.
    let fullPath = urlJoin(baseURL || '', path) || path;

    const resolveArg = (argName: string, value: any) => {
      const argDef = field.args?.find(arg => arg.name === argName);
      if (!argDef || value == null || typeof value !== 'object') {
        return value;
      }
      return resolveDataByUnionInputType(
        JSON.parse(JSON.stringify(value)),
        argDef.type,
        schema,
      );
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
        return { href: fullPath, originPath: fullPath.split('?')[0], query: {} as Record<string, string> };
      }
    })();

    const headers: Record<string, string> = {};
    applyHeaders(headers, source?.http?.headers, vars);
    applyHeaders(headers, connectArgs.http?.headers, vars);

    const method = picked.method;
    const requestInit: RequestInit = {
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
      // Multipart needs the live File/Blob values from args (not JSON round-trip).
      if (contentType?.includes('multipart/form-data')) {
        delete headers['content-type'];
        delete headers['Content-Type'];
        const input =
          connectArgs.http?.body === '$args.input' || connectArgs.http?.body?.startsWith('$args.input')
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
                formDataValue = new File(
                  [inputValue.createReadStream() as any],
                  inputValue.filename || 'file',
                  { type: inputValue.mimetype },
                );
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
            formData.append(key, formDataValue);
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
    const operationLogger = log.child?.({ operation: `${info.parentType.name}.${info.fieldName}` }) || log;
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
      const customExtensions =
        customExtensionsRaw &&
        typeof customExtensionsRaw === 'object' &&
        !Array.isArray(customExtensionsRaw)
          ? { ...customExtensionsRaw }
          : {};
      // Apollo Connectors: custom extensions overlay defaults; code/service/coordinate/http.status
      // remain present (router always adds them after customizations).
      const httpExt = {
        status: response.status,
        ...(customExtensions.http && typeof customExtensions.http === 'object'
          ? customExtensions.http
          : {}),
      };
      delete customExtensions.http;
      const connectorExt = {
        coordinate: connectorCoordinate,
        ...(customExtensions.connector && typeof customExtensions.connector === 'object'
          ? customExtensions.connector
          : {}),
      };
      delete customExtensions.connector;
      const code = customExtensions.code ?? 'CONNECTOR_FETCH';
      delete customExtensions.code;
      const service = customExtensions.service ?? serviceName;
      delete customExtensions.service;
      return new GraphQLError(
        typeof customMessage === 'string' && customMessage.length
          ? customMessage
          : 'Request failed',
        {
          extensions: {
            ...customExtensions,
            http: httpExt,
            connector: connectorExt,
            code,
            service,
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
            status: response.status,
            headers: getHeadersObj(response.headers),
            responseJson: body,
            ...(parseError ? { originalError: parseError } : {}),
          },
        },
      );
    };

    const evaluateIsSuccess = (body: any): boolean => {
      const isSuccessExpr =
        connectArgs.isSuccess ?? source?.isSuccess ?? source?.http?.isSuccess;
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
        } else if (response.status.toString().startsWith('2') && !isScalarType(returnNamedGraphQLType)) {
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
      for (const key of Object.keys(parentPath)) {
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
        return prop in args || (args.input != null && prop in args.input) || (obj != null && prop in obj);
      },
      // So Object.keys / inheritance see pathless fallbacks like `username` on the resource.
      ownKeys() {
        const keys = new Set<string>([
          ...Object.keys(args),
          ...(args.input && typeof args.input === 'object' ? Object.keys(args.input) : []),
        ]);
        if (obj && typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            if (key.startsWith('$')) continue;
            const value = obj[key];
            // Only scalar-ish fields are meaningful as path params
            if (value == null || typeof value === 'object') continue;
            keys.add(key);
          }
        }
        return [...keys];
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
  opts: {
    globalFetch?: MeshFetch;
    log?: HiveLogger;
    timeout?: number;
    queryStringOptions?: MeshQsOptions;
  } = {},
) {
  const typeMap = schema.getTypeMap();
  for (const typeName in typeMap) {
    const type = typeMap[typeName];
    if (!('getFields' in type)) continue;
    const fields = type.getFields();
    for (const fieldName in fields) {
      const field = fields[fieldName];
      const directives = getDirectiveExtensions(field)?.connect as ConnectArgs[] | undefined;
      if (!directives?.length) continue;
      // First connect wins for execution (repeatable for schema merge cases)
      addConnectFieldResolver(schema, field as GraphQLField<any, any>, directives[0], opts);
    }
  }
  return schema;
}
