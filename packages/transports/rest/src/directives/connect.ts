import type {
  GraphQLField,
  GraphQLResolveInfo,
  GraphQLSchema,
} from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import { process } from '@graphql-mesh/cross-helpers';
import type { MeshFetch } from '@graphql-mesh/types';
import { DefaultLogger, getHeadersObj } from '@graphql-mesh/utils';
import { createGraphQLError, getDirectiveExtensions } from '@graphql-tools/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import urlJoin from 'url-join';


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

type ConnectArgs = {
  source?: string;
  http?: ConnectHttp;
  selection?: string;
  entity?: boolean;
};

type SourceArgs = {
  name: string;
  http: {
    baseURL: string;
    headers?: Array<{ name: string; value?: string; from?: string }>;
    queryParams?: string;
  };
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
  return template.replace(/\{(\$[a-zA-Z_][\w.]*)\}/g, (_, path: string) => {
    const value = lookupVar(path, vars);
    return value == null ? '' : String(value);
  });
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

/**
 * Minimal queryParams mapping.
 * Supports:
 * - object literal: `{ "foo:bar": $args.foo_bar, limit: $args.limit }`
 * - line form: `limit: $args.limit`
 * Arrays repeat the key. Null values are omitted.
 */
function applyQueryParams(
  url: URL,
  queryParamsSelection: string | undefined,
  vars: {
    args: Record<string, any>;
    thisValue: any;
    env: Record<string, string | undefined>;
    context: any;
  },
) {
  if (!queryParamsSelection) {
    return;
  }
  const entries = parseQueryParamsEntries(queryParamsSelection);
  for (const [key, expr] of entries) {
    const value = evalQueryParamExpr(expr, vars);
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
    } else {
      url.searchParams.set(key, String(value));
    }
  }
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
      headers[mapping.name.toLowerCase()] = resolveTemplate(mapping.value, {
        ...vars,
        config: {},
      });
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
  const parts = path.replace(/^\$\.?/, '').split('.');
  let cur = root;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function evalSubSelection(
  selection: string,
  root: any,
  extras: { status?: number; responseHeaders?: Headers },
): any {
  if (Array.isArray(root)) {
    return root.map(item => evalSubSelection(selection, item, extras));
  }
  const result: Record<string, any> = {};
  const tokens = tokenizeSelection(selection);
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

function tokenizeSelection(selection: string): SelectionToken[] {
  const tokens: SelectionToken[] = [];
  let i = 0;
  const s = selection.trim();
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    // alias or field
    let start = i;
    while (i < s.length && /[A-Za-z0-9_$.]/.test(s[i])) i++;
    let name = s.slice(start, i);
    while (i < s.length && /\s/.test(s[i])) i++;
    let alias = name;
    let source = name;
    if (s[i] === ':') {
      i++;
      while (i < s.length && /\s/.test(s[i])) i++;
      start = i;
      while (i < s.length && /[A-Za-z0-9_$.]/.test(s[i])) i++;
      source = s.slice(start, i);
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
): string | undefined {
  if (!bodySelection) return undefined;
  const trimmed = bodySelection.trim();
  if (trimmed === '$args') {
    return JSON.stringify(vars.args);
  }
  if (trimmed.startsWith('$args')) {
    // `$args` or `$args.input { ... }` — for now send args / args.input
    if (trimmed === '$args' || trimmed.startsWith('$args ')) {
      return JSON.stringify(vars.args);
    }
    const pathMatch = trimmed.match(/^\$args\.(\w+)/);
    if (pathMatch) {
      return JSON.stringify(vars.args[pathMatch[1]]);
    }
  }
  if (trimmed.startsWith('$({') && trimmed.endsWith('})')) {
    try {
      return JSON.stringify(JSON.parse(trimmed.slice(2, -1)));
    } catch {
      /* fall through */
    }
  }
  // Fallback: evaluate as subselection over args
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
    log?: Logger;
  } = {},
) {
  const log = opts.log || new DefaultLogger('connect');
  const sources = getSourceMap(schema);
  const source = connectArgs.source ? sources.get(connectArgs.source) : undefined;
  const picked = pickHttp(connectArgs.http);

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

    const vars = {
      args: args || {},
      thisValue: root,
      env: process.env,
      context: context || {},
      config: {},
    };

    const baseURL = source?.http?.baseURL || '';
    const path = resolveTemplate(picked.path, vars);
    let fullUrl: URL;
    try {
      fullUrl = new URL(path, baseURL || undefined);
    } catch {
      fullUrl = new URL(urlJoin(baseURL, path));
    }

    applyQueryParams(fullUrl, source?.http?.queryParams, vars);
    applyQueryParams(fullUrl, connectArgs.http?.queryParams, vars);

    const headers: Record<string, string> = {};
    applyHeaders(headers, source?.http?.headers, vars);
    applyHeaders(headers, connectArgs.http?.headers, vars);

    const method = picked.method;
    const requestInit: RequestInit = {
      method,
      headers,
    };
    if (method !== 'GET' && method !== 'HEAD') {
      const body = buildBody(connectArgs.http?.body, vars);
      if (body != null) {
        requestInit.body = body;
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json';
        }
      }
    }

    const fetchFn: MeshFetch = context?.fetch || opts.globalFetch || defaultFetch;
    const operationLogger = log.child?.({ operation: `${info.parentType.name}.${info.fieldName}` }) || log;
    operationLogger.debug?.(`Connect ${method} ${fullUrl.toString()}`);

    const response = await fetchFn(fullUrl.toString(), requestInit, context, info as any);
    const contentType = response.headers.get('content-type') || '';
    let responseData: any;
    if (contentType.includes('json') || !contentType) {
      const text = await response.text();
      responseData = text ? JSON.parse(text) : null;
    } else if (contentType.startsWith('text/')) {
      responseData = await response.text();
    } else {
      responseData = null;
    }

    if (!response.ok && connectArgs.selection && !connectArgs.selection.includes('$status')) {
      // Default: non-2xx becomes GraphQL error unless selection handles $status
      throw createGraphQLError(`Connect HTTP ${response.status}: ${response.statusText}`, {
        extensions: {
          status: response.status,
          headers: getHeadersObj(response.headers),
        },
      });
    }

    return applySelection(connectArgs.selection || '$', responseData, {
      status: response.status,
      responseHeaders: response.headers,
    });
  };
}

export function processConnectDirectives(
  schema: GraphQLSchema,
  opts: {
    globalFetch?: MeshFetch;
    log?: Logger;
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
