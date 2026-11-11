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
export function toConnectPathTemplate(path: string): string {
  return path
    .replace(/\{args\./g, '{$args.')
    .replace(/\{root\./g, '{$this.')
    .replace(/\{this\./g, '{$this.')
    .replace(/\{env\./g, '{$env.')
    .replace(/\{context\./g, '{$context.');
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
): string | undefined {
  if (!queryParamArgMap || !Object.keys(queryParamArgMap).length) {
    return undefined;
  }
  // Object-literal form so keys like `foo:bar` stay intact (line `key: expr` cannot).
  const lines = Object.entries(queryParamArgMap).map(([queryParam, argName]) => {
    const key = /^[A-Za-z_][\w]*$/.test(queryParam)
      ? queryParam
      : JSON.stringify(queryParam);
    return `  ${key}: $args.${argName}`;
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
    // Status-code / abstract unions need $status->match; leave a placeholder leaf selection
    // so the connector is valid. Concrete mapping is filled when status branches are known.
    const members = named.getTypes();
    if (members.length === 1) {
      return buildSelectionForType(members[0], { skipFields, depth: depth + 1 });
    }
    return members
      .map(member => {
        const inner = buildSelectionForType(member, { skipFields, depth: depth + 1 });
        return inner
          ? `... on ${member.name} { ${inner} }`
          : `__typename: $("${member.name}")`;
      })
      .join('\n');
  }
  if (!isObjectType(named)) {
    return '';
  }
  const lines: string[] = [];
  const fields = named.getFields();
  for (const fieldName of Object.keys(fields)) {
    if (skipFields.has(fieldName) || fieldName.startsWith('__')) {
      continue;
    }
    const field = fields[fieldName];
    const fieldDirectives = (field.astNode?.directives || []).map(d => d.name.value);
    const extDirectives = Object.keys(
      ((field.extensions as any)?.directives as Record<string, unknown>) || {},
    );
    if (
      fieldDirectives.includes('connect') ||
      extDirectives.includes('connect') ||
      fieldDirectives.includes('oas_link') ||
      extDirectives.includes('oas_link')
    ) {
      continue;
    }
    const fieldNamed = unwrapType(field.type);
    if (isObjectType(fieldNamed) || isUnionType(fieldNamed) || isListType(field.type) || isNonNullType(field.type) && (isListType(field.type.ofType) || isObjectType(unwrapType(field.type)))) {
      const nested = buildSelectionForType(field.type, { skipFields, depth: depth + 1 });
      if (nested) {
        lines.push(`${fieldName} {\n${indent(nested, 2)}\n}`);
      } else if (isScalarType(unwrapType(field.type))) {
        lines.push(fieldName);
      } else {
        // object with no selectable fields yet
        lines.push(fieldName);
      }
    } else {
      lines.push(fieldName);
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
  const queryParams = buildQueryParamsSelection(opts.queryParamArgMap);
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
  // Prefer a single request input arg when present via requestTypeName / conventional name
  if (httpOp.requestTypeName) {
    // GraphQL arg is often named after the field or "input"
    return `$args`;
  }
  if (httpOp.requestSample != null || httpOp.requestSchema != null) {
    return `$args`;
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
    baseURL: opts.endpoint,
  };
  const headers = headersToConnectMappings(opts.headers);
  if (headers) {
    http.headers = headers;
  }
  if (opts.queryParams && Object.keys(opts.queryParams).length) {
    http.queryParams = Object.entries(opts.queryParams)
      .map(([key, value]) => `${key}: $(${JSON.stringify(value)})`)
      .join('\n');
  }
  return {
    name: opts.name,
    http,
  };
}
