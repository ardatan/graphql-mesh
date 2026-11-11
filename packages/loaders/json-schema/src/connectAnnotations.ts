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
  type GraphQLUnionType,
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

function collectObjectPropertyNames(
  schema:
    | { type?: string; properties?: Record<string, unknown>; anyOf?: any[]; oneOf?: any[] }
    | undefined,
): string[] {
  if (!schema) return [];
  if (schema.properties && typeof schema.properties === 'object') {
    return Object.keys(schema.properties);
  }
  for (const branch of [...(schema.anyOf || []), ...(schema.oneOf || [])]) {
    const props = branch?.properties as Record<string, unknown> | undefined;
    if (props && typeof props === 'object') {
      return Object.keys(props);
    }
  }
  return [];
}

/**
 * Build Connectors `http.queryParams` mapping from Mesh queryParamArgMap.
 * deepObject params with known properties expand to `filter[name]: $args.filter.name`.
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
    // OpenAPI deepObject with known properties → Apollo-friendly expanded keys.
    if (paramOpts?.deepObject) {
      const propNames = collectObjectPropertyNames(argSchema);
      if (propNames.length) {
        for (const prop of propNames) {
          const deepKey = `${queryParam}[${prop}]`;
          const key = /^[A-Za-z_][\w]*$/.test(deepKey) ? deepKey : JSON.stringify(deepKey);
          lines.push(`  ${key}: $args.${argName}.${prop}`);
        }
        continue;
      }
    }
    const key = /^[A-Za-z_][\w]*$/.test(queryParam) ? queryParam : JSON.stringify(queryParam);
    let expr = `$args.${argName}`;
    // Apollo Connectors: explode:false / form style arrays → comma-joined list
    if (paramOpts?.arrayFormat === 'comma' && argType === 'array') {
      expr = `$args.${argName}->joinNotNull(",")`;
    }
    lines.push(`  ${key}: ${expr}`);
  }
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
 * Apollo Connectors status-union helpers: `isSuccess` + `__typename` via `$status->match`.
 *
 * `__typename` arms only use concrete union members. Mappings that point at an
 * interface / non-member (e.g. OpenAPI discriminator parent) are omitted so
 * Hive `resolveType` can finish via `$statusCode` + discriminator.
 */
export function buildStatusUnionConnectExtras(unionType: GraphQLUnionType): {
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
  const concreteMappings = mappings.filter(m => memberNames.has(m.typeName));
  const concreteExplicit = concreteMappings.filter(m => m.statusCode !== 'default');
  const successArms = explicitMappings.map(m => `[${toMatchKey(m.statusCode)}, true]`).join(', ');
  let typenameSelection: string | null = null;
  if (concreteExplicit.length && concreteMappings.length === mappings.length) {
    const typenameArms = concreteExplicit
      .map(m => `[${toMatchKey(m.statusCode)}, ${JSON.stringify(m.typeName)}]`)
      .join(', ');
    const defaultType =
      concreteMappings.find(m => m.statusCode === 'default')?.typeName ??
      concreteExplicit[0]?.typeName;
    typenameSelection = `__typename: $status->match(${typenameArms}, [@, ${JSON.stringify(defaultType)}])`;
  } else if (concreteExplicit.length || concreteMappings.some(m => m.statusCode === 'default')) {
    const typenameArms = concreteExplicit
      .map(m => `[${toMatchKey(m.statusCode)}, ${JSON.stringify(m.typeName)}]`)
      .join(', ');
    const defaultType = concreteMappings.find(m => m.statusCode === 'default')?.typeName;
    // Null default leaves `__typename` unset for abstract-mapped / unlisted statuses.
    typenameSelection = typenameArms
      ? `__typename: $status->match(${typenameArms}, [@, ${defaultType != null ? JSON.stringify(defaultType) : 'null'}])`
      : defaultType != null
        ? `__typename: $status->match([@, ${JSON.stringify(defaultType)}])`
        : null;
  }
  return {
    isSuccess: `$status->match(${successArms ? `${successArms}, ` : ''}[@, ${hasDefault}])`,
    typenameSelection,
  };
}

/**
 * Build a Connectors selection that maps JSON fields with matching GraphQL names.
 * Skips fields that already have their own `@connect` (e.g. links).
 */
/** Soft cap so huge OpenAPI schemas (K8s/Stripe) don't emit multi‑MB `@connect` selections. */
const MAX_CONNECT_SELECTION_CHARS = 12_000;

export function buildSelectionForType(
  type: GraphQLOutputType,
  options: { skipFields?: Set<string>; depth?: number } = {},
): string {
  const { skipFields = new Set(), depth = 0 } = options;
  // Depth 2: root fields + one nested object level. Deeper nests pass through as bare names.
  if (depth > 2) {
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
    // Status-code unions: emit `__typename: $status->match(...)` + flattened member fields.
    // Only walk members when status mappings exist — otherwise getFields() during emit can
    // finalize graphql-compose object types before pending link fields are attached.
    const statusExtras = buildStatusUnionConnectExtras(named);
    if (!statusExtras) {
      // Non-status unions: pass through raw payload for Hive discriminator / resolveType.
      return '';
    }
    // Merge by top-level field block (brace-aware). Line-by-line dedupe would
    // drop subsequent `}` closers and corrupt nested selections.
    const merged = new Map<string, string>();
    for (const member of members) {
      const part = buildSelectionForType(member, { skipFields, depth: depth + 1 });
      if (!part) continue;
      for (const [key, block] of extractTopLevelSelectionFields(part)) {
        if (!merged.has(key)) {
          merged.set(key, block);
        }
      }
    }
    const mergedSelection = [statusExtras.typenameSelection, ...merged.values()]
      .filter(Boolean)
      .join('\n');
    if (mergedSelection.length > MAX_CONNECT_SELECTION_CHARS) {
      // Fall back to `$` (caller); runtime still resolves via `@statusCodeTypeName`.
      return '';
    }
    return mergedSelection;
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
  for (const rawFieldName of Object.keys(fields)) {
    const fieldName = String(rawFieldName);
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
    const aliasPrefix: string =
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
  const joined = lines.join('\n');
  if (joined.length > MAX_CONNECT_SELECTION_CHARS) {
    return '';
  }
  return joined;
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => (line ? pad + line : line))
    .join('\n');
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

/**
 * Infer `@connect(http.body:)` from Mesh operation request config.
 * When both `requestSchema`/`input` and `requestBaseBody` exist, emit `$args.input`
 * and stash the base body on `meshRestOptions` for runtime merge (see transport-rest).
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
  // Conventional Mesh/OpenAPI request arg is `input`; Connectors body maps from it.
  if (httpOp.requestTypeName || httpOp.requestSample != null || httpOp.requestSchema != null) {
    return `$args.input`;
  }
  if (httpOp.requestBaseBody != null) {
    return `$(${JSON.stringify(httpOp.requestBaseBody)})`;
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
