import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLInputObjectType,
  GraphQLInt,
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
import { ObjMapScalar } from '@graphql-mesh/transport-common';
import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import { getMeshEntityRef } from './entityRefs.js';
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

/**
 * Mesh-only field options that must survive compose → SDL → reload.
 * Apollo Connectors SDL has no home for qs/timeout/binary/requestBaseBody;
 * store them here and restore into `field.extensions.meshRestOptions` at process time.
 */
export const MeshRestOptionsDirective = new GraphQLDirective({
  name: 'meshRestOptions',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    queryStringOptions: { type: ObjMapScalar },
    queryStringOptionsByParam: { type: ObjMapScalar },
    requestBaseBody: { type: ObjMapScalar },
    timeout: { type: GraphQLInt },
    isBinary: { type: GraphQLBoolean },
  },
});

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
 * `@discriminator(field, mapping)` → `__typename: $[field]->match([json, Type], …)`.
 */
export function buildDiscriminatorTypenameSelection(type: {
  getFields?: () => Record<string, unknown>;
  astNode?: { directives?: readonly any[] } | null;
  extensions?: unknown;
}): string {
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
    return '';
  }
  const fieldPath = /^[A-Za-z_][\w]*$/.test(field) ? `$.${field}` : `$[${JSON.stringify(field)}]`;
  const arms = mapping
    .map(([json, typeName]) => `[${JSON.stringify(json)}, ${JSON.stringify(typeName)}]`)
    .join(', ');
  return `__typename: ${fieldPath}->match(${arms})`;
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
  const rootBracket = raw.match(/^\{root\[['\"]([^'\"]+)['\"]\]\}$/);
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
    .replace(/\{root\[['\"]([^'\"]+)['\"]\]\}/g, (_, key: string) => {
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
 * Apollo Connectors status-union helpers: `isSuccess` + `__typename` via `$status->match`.
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
    // Try reading discriminator from any schema type named `typeName` via union's parent schema is
    // unavailable here — callers pass schemaTypes when available. Fall back: scan member parents.
    let disc = abstractType ? buildDiscriminatorTypenameSelection(abstractType) : '';
    if (!disc) {
      for (const member of unionType.getTypes()) {
        const ifaces = (member as any).getInterfaces?.() || [];
        for (const iface of ifaces) {
          if (iface.name === typeName) {
            disc = buildDiscriminatorTypenameSelection(iface);
            if (disc) break;
          }
        }
        if (disc) break;
      }
    }
    // `buildDiscriminatorTypenameSelection` returns `__typename: <expr>`; take `<expr>`.
    if (disc.startsWith('__typename:')) {
      return disc.slice('__typename:'.length).trim();
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
/** Soft cap so huge OpenAPI schemas (K8s/Stripe) don't emit multi‑MB `@connect` selections. */
const MAX_CONNECT_SELECTION_CHARS = 12_000;

export function buildSelectionForType(
  type: GraphQLOutputType,
  options: {
    skipFields?: Set<string>;
    depth?: number;
    /** Implementing object types when `type` is an interface (exclusive fields). */
    implementations?: ReadonlyArray<GraphQLOutputType>;
  } = {},
): string {
  const { skipFields = new Set(), depth = 0, implementations = [] } = options;
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
    const discTypename = buildDiscriminatorTypenameSelection(named);
    if (!statusExtras && !discTypename) {
      // Non-status / non-discriminator unions: pass through (`$`) for Hive resolveType.
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
    const mergedSelection = [statusExtras?.typenameSelection || discTypename, ...merged.values()]
      .filter(Boolean)
      .join(' ');
    if (mergedSelection.length > MAX_CONNECT_SELECTION_CHARS) {
      // Prefer `__typename` bake alone over `$` so status unions stay Connectors-native
      // after `@statusCodeTypeName` is stripped (no Mesh runtime fallback).
      return statusExtras?.typenameSelection || discTypename || '';
    }
    return mergedSelection;
  }
  if (!isObjectType(named) && !isInterfaceType(named)) {
    return '';
  }
  const fields = { ...named.getFields() };
  // Interface selections must also pick implementor-only fields (e.g. Dog.age).
  if (isInterfaceType(named)) {
    for (const impl of implementations) {
      const implNamed = unwrapType(impl);
      if (!isObjectType(implNamed)) continue;
      Object.assign(fields, implNamed.getFields());
    }
  }
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
  const discTypename = buildDiscriminatorTypenameSelection(named);
  if (discTypename) {
    lines.push(discTypename);
  }
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
    if (fieldDirectives.includes('connect') || extDirectiveNames.includes('connect')) {
      continue;
    }
    // `@resolveRoot` → virtual `@connect(selection: "$")` on the field (finalize step).
    // Skip here so parent `$` passthrough keeps the scalar/object root intact.
    if (Boolean(directiveExt.resolveRoot?.length) || fieldDirectives.includes('resolveRoot')) {
      continue;
    }
    // HATEOAS cross-subgraph entity ref: `supplier: { id: supplierId }`
    let entityRef =
      ((field.extensions as any)?.meshEntityRef as Record<string, string> | undefined) ||
      getMeshEntityRef(named.name, fieldName);
    if (!entityRef && isObjectType(named)) {
      for (const iface of named.getInterfaces()) {
        entityRef = getMeshEntityRef(iface.name, fieldName);
        if (entityRef) break;
      }
    }
    if (entityRef && Object.keys(entityRef).length) {
      // Apollo entity references need a string-literal `__typename` plus key fields:
      // `supplier: { __typename: $("Supplier") id: supplierId }`
      const entityTypeName = unwrapType(field.type).name;
      const parts = [
        `__typename: $(${JSON.stringify(entityTypeName)})`,
        ...Object.entries(entityRef).map(([keyField, fromField]) =>
          keyField === fromField ? keyField : `${keyField}: ${fromField}`,
        ),
      ];
      lines.push(`${fieldName}: { ${parts.join(' ')} }`);
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
    // Apollo Connectors: safe idents are bare paths; hyphenated/odd keys need `$["…"]`.
    // (A bare JSON string like `"patent-id"` is a literal, not a path, on Router.)
    const jsonPath =
      jsonName && jsonName !== fieldName
        ? /^[A-Za-z_][\w]*$/.test(jsonName)
          ? jsonName
          : `$[${JSON.stringify(jsonName)}]`
        : fieldName;
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
    if (
      isObjectType(fieldNamed) ||
      isInterfaceType(fieldNamed) ||
      isUnionType(fieldNamed) ||
      isListType(field.type) ||
      (isNonNullType(field.type) &&
        (isListType(field.type.ofType) || isObjectType(unwrapType(field.type))))
    ) {
      const nested = buildSelectionForType(field.type, { skipFields, depth: depth + 1 });
      if (nested) {
        lines.push(`${aliasPrefix} { ${nested} }`);
      } else {
        lines.push(aliasPrefix);
      }
    } else {
      lines.push(aliasPrefix);
    }
  }
  // Spaces are enough for Connectors mapping (newlines are optional sugar).
  // Avoid `\n` escapes in printed SDL (`selection: "id name"` vs `"id\\nname"`).
  const joined = lines.join(' ');
  if (joined.length > MAX_CONNECT_SELECTION_CHARS) {
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
 * Rewrite `$args.input` body to include baked `@resolveRootField` key remaps.
 */
export function bakeInputBodySelection(
  body: string | undefined,
  args: Record<string, { type: GraphQLInputType }> | ReadonlyArray<GraphQLArgument> | undefined,
): string | undefined {
  if (!body || !args) return body;
  const trimmed = body.trim();
  if (trimmed !== '$args.input' && !trimmed.startsWith('$args.input {')) {
    return body;
  }
  // Already has an explicit subselection — leave it.
  if (trimmed.includes('{')) return body;
  const argList = Array.isArray(args)
    ? args
    : Object.entries(args).map(([name, arg]) => ({ ...arg, name }));
  const inputArg = argList.find(a => a.name === 'input');
  if (!inputArg) return body;
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
