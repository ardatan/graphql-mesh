import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType,
  type GraphQLNamedOutputType,
  type GraphQLOutputType,
} from 'graphql';
import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import type { JSONSchemaHTTPJSONOperationConfig, JSONSchemaOperationConfig } from './types.js';

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

export const SourceHTTPInput = new GraphQLInputObjectType({
  name: 'SourceHTTP',
  fields: {
    baseURL: { type: new GraphQLNonNull(GraphQLString) },
    headers: { type: new GraphQLList(new GraphQLNonNull(HTTPHeaderMappingInput)) },
    queryParams: { type: JSONSelectionScalar },
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
  },
  isRepeatable: true,
});

export const SourceDirective = new GraphQLDirective({
  name: 'source',
  locations: [DirectiveLocation.SCHEMA],
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    http: { type: new GraphQLNonNull(SourceHTTPInput) },
  },
  isRepeatable: true,
});

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

  // Fall back: normalize Mesh → Connectors, then rewrite leftover response body pointers.
  return toConnectPathTemplate(raw)
    .replace(/\{\$this\.\$response\.body#\/([^}]+)\}/g, (_, pointer: string) => {
      return `{$this.${toThisPath(pointer)}}`;
    })
    .replace(/\{\$this\.\$response\.body\.([^}]+)\}/g, (_, pointer: string) => {
      return `{$this.${toThisPath(pointer)}}`;
    });
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

export function buildQueryParamsSelection(
  queryParamArgMap?: Record<string, string>,
  queryStringOptionsByParam?: Record<string, { arrayFormat?: string; destructObject?: boolean }>,
  argTypeMap?: Record<string, { type?: string }>,
): string | undefined {
  if (!queryParamArgMap || !Object.keys(queryParamArgMap).length) {
    return undefined;
  }
  // Object-literal form so keys like `foo:bar` stay intact (line `key: expr` cannot).
  const lines = Object.entries(queryParamArgMap).map(([queryParam, argName]) => {
    const key = /^[A-Za-z_][\w]*$/.test(queryParam)
      ? queryParam
      : JSON.stringify(queryParam);
    let expr = `$args.${argName}`;
    const paramOpts = queryStringOptionsByParam?.[queryParam];
    const argType = argTypeMap?.[argName]?.type || argTypeMap?.[queryParam]?.type;
    // Apollo Connectors: explode:false / form style arrays → comma-joined list
    if (paramOpts?.arrayFormat === 'comma' && argType === 'array') {
      expr = `$args.${argName}->joinNotNull(",")`;
    }
    return `  ${key}: ${expr}`;
  });
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
 * Build a Connectors selection that maps JSON fields with matching GraphQL names.
 * Skips fields that already have their own `@connect` (e.g. links).
 */
export function buildSelectionForType(
  type: GraphQLOutputType,
  options: { skipFields?: Set<string>; depth?: number } = {},
): string {
  const { skipFields = new Set(), depth = 0 } = options;
  if (depth > 8) {
    return '';
  }
  const named = unwrapType(type);
  if (isScalarType(named) || named.name === 'Void') {
    return '';
  }
  if (isUnionType(named)) {
    const members = named.getTypes();
    if (members.length === 1) {
      return buildSelectionForType(members[0], { skipFields, depth: depth + 1 });
    }
    // Pass through the raw payload (`$` at field level). Hive `@discriminator` /
    // `resolveType` and field resolvers map concrete members; emitting `... on`
    // fragments here is not executable by our selection subset yet.
    return '';
  }
  if (!isObjectType(named)) {
    return '';
  }
  const fields = named.getFields();
  // Types with `@dictionary` (additionalProperties) must pass through the raw JSON object
  // so dictionary resolvers can see unknown keys. Nested field picking would drop them.
  const hasDictionaryField = Object.values(fields).some(field => {
    const ext = (field.extensions as any)?.directives || {};
    if (ext.dictionary) return true;
    return field.astNode?.directives?.some(d => d.name.value === 'dictionary');
  });
  if (hasDictionaryField) {
    return '';
  }
  const lines: string[] = [];
  for (const fieldName of Object.keys(fields)) {
    if (skipFields.has(fieldName) || fieldName.startsWith('__')) {
      continue;
    }
    const field = fields[fieldName];
    const directiveExt = ((field.extensions as any)?.directives || {}) as Record<
      string,
      Array<{ field?: string }> | undefined
    >;
    const fieldDirectives = (field.astNode?.directives || []).map(d => d.name.value);
    const extDirectiveNames = Object.keys(directiveExt);
    if (
      fieldDirectives.includes('connect') ||
      extDirectiveNames.includes('connect') ||
      fieldDirectives.includes('oas_link') ||
      extDirectiveNames.includes('oas_link')
    ) {
      continue;
    }
    // `@resolveRootField(field: "foo-bar")` → GraphQL `foo_bar` from JSON `foo-bar`
    const resolveRootField =
      directiveExt.resolveRootField?.[0]?.field ||
      field.astNode?.directives?.find(d => d.name.value === 'resolveRootField')?.arguments?.find(
        a => a.name.value === 'field',
      );
    let jsonName: string | undefined;
    if (typeof resolveRootField === 'string') {
      jsonName = resolveRootField;
    } else if (resolveRootField && 'value' in resolveRootField) {
      const v = (resolveRootField as any).value;
      jsonName = v?.value ?? v;
    }
    const aliasPrefix =
      jsonName && jsonName !== fieldName
        ? `${fieldName}: ${/^[A-Za-z_][\w]*$/.test(jsonName) ? jsonName : JSON.stringify(jsonName)}`
        : fieldName;
    const fieldNamed = unwrapType(field.type);
    if (
      isObjectType(fieldNamed) ||
      isUnionType(fieldNamed) ||
      isListType(field.type) ||
      (isNonNullType(field.type) &&
        (isListType(field.type.ofType) || isObjectType(unwrapType(field.type))))
    ) {
      const nested = buildSelectionForType(field.type, { skipFields, depth: depth + 1 });
      if (nested) {
        lines.push(`${aliasPrefix} {\n${indent(nested, 2)}\n}`);
      } else {
        lines.push(aliasPrefix);
      }
    } else {
      lines.push(aliasPrefix);
    }
  }
  return lines.join('\n');
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => (line ? pad + line : line))
    .join('\n');
}

export function buildConnectHttpArgs(opts: {
  httpMethod: string;
  path: string;
  headers?: Record<string, string> | [string, string][];
  queryParamArgMap?: Record<string, string>;
  queryStringOptionsByParam?: Record<
    string,
    { arrayFormat?: string; destructObject?: boolean; [key: string]: unknown }
  >;
  argTypeMap?: Record<string, { type?: string }>;
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
  );
  if (queryParams) {
    http.queryParams = queryParams;
  }
  if (opts.bodySelection && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    http.body = opts.bodySelection;
  }
  return http;
}

export function inferBodySelection(
  operationConfig: JSONSchemaOperationConfig,
): string | undefined {
  if (!('path' in operationConfig)) {
    return undefined;
  }
  const httpOp = operationConfig as JSONSchemaHTTPJSONOperationConfig;
  const method = (httpOp.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return undefined;
  }
  // Conventional Mesh/OpenAPI request arg is `input`; Connectors body maps from it.
  if (
    httpOp.requestTypeName ||
    httpOp.requestSample != null ||
    httpOp.requestSchema != null
  ) {
    return `$args.input`;
  }
  if (httpOp.requestBaseBody != null) {
    return `$({ ... })`;
  }
  return undefined;
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
