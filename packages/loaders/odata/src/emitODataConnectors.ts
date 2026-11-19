import type { GraphQLSchema } from 'graphql';
import type {
  InterfaceTypeComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfig,
  SchemaComposer,
  UnionTypeComposer,
} from 'graphql-compose';
import type { Logger } from '@graphql-hive/logger';
import {
  CONNECT_LINK_URL,
  ConnectDirective,
  FEDERATION_LINK_URL,
  LinkDirective,
  ODATA_ACCEPT_METADATA,
  ODATA_ERROR_MAPPING,
  ODATA_QUERY_OPTIONS_QUERY_PARAMS,
  SourceDirective,
} from './odataConnectors.js';
import type { ODataFieldEmit } from './types.js';

/** Mesh `{env.X}` / `{args.X}` → Connectors `{$env.X}` / `{$args.X}`. */
function toConnectHeaderValue(value: string): string {
  return String(value)
    .replace(/\{env\./g, '{$env.')
    .replace(/\{args\./g, '{$args.')
    .replace(/\{context\./g, '{$context.')
    .replace(/\{this\./g, '{$this.');
}

function headersToConnectMappings(
  headers?: Record<string, string> | [string, string][],
): Array<{ name: string; value: string }> | undefined {
  if (!headers) return undefined;
  const entries = Array.isArray(headers) ? headers : Object.entries(headers);
  if (!entries.length) return undefined;
  return entries.map(([name, value]) => ({
    name,
    value: toConnectHeaderValue(String(value)),
  }));
}

/**
 * Connectors LitObject rule is all-commas XOR all-whitespace inside one `{…}`.
 * `entitySelection` emits whitespace-separated picks (`UserName FirstName` /
 * `AddressInfo { Address }`). Mixing that with `__typename: "T", …` (comma) is a
 * parse error → Router `nom::Eof`. Rewrite the bag to comma-separated form.
 */
function toConnectorsCommaObjectBody(selection: string): string {
  const s = selection.trim();
  if (!s) return '';
  const parts: string[] = [];
  let i = 0;
  const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
  const isIdent = (c: string) => /[A-Za-z0-9_]/.test(c);
  /** Skip balanced `(…)` / `{…}` / `[…]` / quoted strings from `i`. */
  const skipBalanced = (open: string, close: string): void => {
    let depth = 0;
    for (; i < s.length; i++) {
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
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) {
          i++;
          return;
        }
      }
    }
  };
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    // Abstract spread: `... $->get("…")->match([…], …)` - keep as one part (already
    // comma-safe inside match arrays; do not rewrite).
    if (s.startsWith('...', i)) {
      const start = i;
      i += 3;
      while (i < s.length && /\s/.test(s[i])) i++;
      // Path / method chain until we leave the spread expression.
      while (i < s.length) {
        if (s[i] === '(') {
          skipBalanced('(', ')');
          continue;
        }
        if (s[i] === '[') {
          skipBalanced('[', ']');
          continue;
        }
        if (s[i] === '{') {
          skipBalanced('{', '}');
          continue;
        }
        if (/\s/.test(s[i])) {
          let k = i;
          while (k < s.length && /\s/.test(s[k])) k++;
          // Next named field / another spread ends this spread expr.
          if (k < s.length && (isIdentStart(s[k]) || s.startsWith('...', k))) break;
          i = k;
          continue;
        }
        i++;
      }
      parts.push(s.slice(start, i).trim());
      continue;
    }
    if (!isIdentStart(s[i])) {
      parts.push(s.slice(i).trim());
      break;
    }
    let j = i + 1;
    while (j < s.length && isIdent(s[j])) j++;
    const name = s.slice(i, j);
    i = j;
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i < s.length && s[i] === ':') {
      i++;
      while (i < s.length && /\s/.test(s[i])) i++;
      if (i < s.length && s[i] === '{') {
        const start = i;
        skipBalanced('{', '}');
        const inner = toConnectorsCommaObjectBody(s.slice(start + 1, i - 1));
        parts.push(`${name}: { ${inner} }`);
      } else {
        const start = i;
        while (i < s.length) {
          if (s[i] === '(') {
            skipBalanced('(', ')');
            continue;
          }
          if (s[i] === '[') {
            skipBalanced('[', ']');
            continue;
          }
          if (s[i] === '{') {
            skipBalanced('{', '}');
            continue;
          }
          if (/\s/.test(s[i])) {
            let k = i;
            while (k < s.length && /\s/.test(s[k])) k++;
            if (k < s.length && (isIdentStart(s[k]) || s.startsWith('...', k))) break;
            i = k;
            continue;
          }
          i++;
        }
        parts.push(`${name}: ${s.slice(start, i).trim()}`);
      }
    } else if (i < s.length && s[i] === '{') {
      const start = i;
      skipBalanced('{', '}');
      const inner = toConnectorsCommaObjectBody(s.slice(start + 1, i - 1));
      // Path+subselection (maps list elements). Bare `{…}` would be a LitObject
      // and collapse arrays → "Expected Iterable".
      parts.push(`${name}: ${name} { ${inner} }`);
    } else {
      parts.push(name);
    }
  }
  return parts.filter(Boolean).join(', ');
}

/**
 * Build one union/interface match arm object with the **full** field bag from the
 * same HTTP JSON (old OData transport style - no key-stub re-fetch).
 *
 * Apollo can still type-merge via `@key` + type-level `@connect(entity: true)` when
 * a payload is only a reference; Hive transport should likewise avoid extra hops
 * when the parent response already carried the entity body (`expandNavProps` / batch).
 *
 * LitObject arms must be all-commas (`toConnectorsCommaObjectBody`); list-shaped
 * nested fields use `path: path { … }` so Router does not see LitObject-vs-Iterable.
 */
function odataTypenameSelectionObject(
  schemaComposer: SchemaComposer,
  name: string,
  visited: Set<string>,
): string {
  let exclusive = '';
  try {
    const otc = schemaComposer.getOTC(name);
    exclusive = entitySelection(schemaComposer, otc, visited);
  } catch {
    exclusive = '';
  }
  const body = toConnectorsCommaObjectBody(exclusive);
  return body
    ? `{ __typename: ${JSON.stringify(name)}, ${body} }`
    : `{ __typename: ${JSON.stringify(name)} }`;
}

/**
 * Connectors abstract spread: map OData `@odata.type` → concrete `__typename`.
 * Required by Apollo Router for interface/union selections (same pattern as OpenAPI
 * `... $_type->match(...)`).
 *
 * When `defaultTypeName` is set, missing `@odata.type` (common under
 * `odata.metadata=minimal`) must use nullish coalescing **before** `->match`:
 * Router treats a missing `get` as `None` and short-circuits the whole path, so
 * a trailing `[@, …]` arm never runs. Hive implements the same `??` shape.
 */
function odataAbstractTypenameSpread(
  schemaComposer: SchemaComposer,
  memberTypeNames: string[],
  defaultTypeName?: string,
  /** Shared cycle history - arms must not reset (Tree → ITree → Tree). */
  visited: Set<string> = new Set(),
): string {
  const arms: string[] = [];
  let defaultODataType: string | undefined;
  for (const name of memberTypeNames) {
    if (!schemaComposer.isObjectType(name)) continue;
    let odataType = `#${name}`;
    try {
      const otc = schemaComposer.getOTC(name);
      odataType =
        ((otc.getExtensions() as any)?.odata?.entityInfo?.odataTypeName as string) || odataType;
    } catch {
      // keep `#name` fallback
    }
    if (defaultTypeName && name === defaultTypeName) {
      defaultODataType = odataType;
    }
    arms.push(
      `[${JSON.stringify(odataType)}, ${odataTypenameSelectionObject(schemaComposer, name, visited)}]`,
    );
  }
  if (!arms.length) return '';
  const disc =
    defaultODataType != null
      ? `$($->get("@odata.type") ?? ${JSON.stringify(defaultODataType)})`
      : `$->get("@odata.type")`;
  return `... ${disc}->match(${arms.join(', ')})`;
}

/**
 * Connectors JSONSelection for an OData entity/complex type.
 * Apollo Router requires object/list fields to use `{ … }` groups (bare names fail).
 * Skip fields with arguments (bound ops / queryOptions nav) - those get their own `@connect`.
 */
function entitySelection(
  schemaComposer: SchemaComposer,
  entityTC: ObjectTypeComposer | InterfaceTypeComposer,
  visited: Set<string> = new Set(),
): string {
  const typeName = entityTC.getTypeName();
  // Cycle detection only - do not truncate acyclic complex property chains
  // (depth limits drop nested scalars with no lazy-fetch fallback).
  if (visited.has(typeName)) {
    return '';
  }
  // Unions: only `__typename` discriminator arms (no field bag on the union itself).
  if (schemaComposer.isUnionType(typeName)) {
    try {
      const utc = schemaComposer.getUTC(typeName);
      const members = (utc.getTypes?.() || [])
        .map((t: any) => (typeof t === 'string' ? t : t.getTypeName?.()))
        .filter((n: unknown): n is string => typeof n === 'string');
      const defaultTypename = (utc.getExtensions() as any)?.odata?.defaultTypename as
        string | undefined;
      return odataAbstractTypenameSpread(schemaComposer, members, defaultTypename, visited);
    } catch {
      return '';
    }
  }
  visited = new Set(visited);
  visited.add(typeName);

  const extBag = (entityTC.getExtensions() as any) || {};
  const entityInfo = extBag.odata?.entityInfo as
    { actualFields?: string[]; navigationFields?: string[] } | undefined;
  const navigationFields = new Set(entityInfo?.navigationFields || []);

  const lines: string[] = [];
  for (const fieldName of entityTC.getFieldNames()) {
    const field = entityTC.getField(fieldName);
    const fieldOData = ((field.extensions as any)?.odata || {}) as ODataFieldEmit;
    const fieldDirs = ((field.extensions as any)?.directives || {}) as Record<string, unknown>;
    // Bound/unbound ops and navigation properties get field-level `@connect`
    // (Apollo OData connector pattern) - not inlined into the parent selection.
    if (
      fieldOData.boundFunction ||
      fieldOData.boundAction ||
      fieldOData.unboundFunction ||
      fieldOData.unboundAction ||
      fieldOData.singularNav ||
      fieldOData.pluralNav ||
      fieldOData.navProp ||
      fieldDirs.connect ||
      navigationFields.has(fieldName)
    ) {
      continue;
    }
    // Nested-only entities use `$this._odataId` (absolute `@odata.id`).
    if (fieldName === '_odataId') {
      lines.push('_odataId: $->get("@odata.id")');
      continue;
    }
    const typeNameStr =
      typeof (field.type as any)?.getTypeName === 'function'
        ? (field.type as any).getTypeName()
        : String(field.type);
    const named = typeNameStr.replace(/[[\]!]/g, '');
    // Open-type catch-all: Map the whole entity JSON (replaces Mesh `@resolveRoot`).
    if (fieldName === 'rest' && named === 'JSON') {
      lines.push('rest: $');
      continue;
    }
    let nested = '';
    if (
      schemaComposer.isObjectType(named) ||
      schemaComposer.isInterfaceType(named) ||
      schemaComposer.isUnionType(named)
    ) {
      try {
        const childTC = schemaComposer.getAnyTC(named) as
          ObjectTypeComposer | InterfaceTypeComposer;
        nested = entitySelection(schemaComposer, childTC, visited);
      } catch {
        nested = '';
      }
      if (!nested) {
        // Empty object expansion (cycle / only-arg fields) - omit; bare name is invalid.
        continue;
      }
      lines.push(`${fieldName} { ${nested} }`);
    } else {
      // Scalar / enum / JSON
      lines.push(fieldName);
    }
  }
  return lines.join(' ');
}

function listSelection(
  schemaComposer: SchemaComposer,
  entityTC: ObjectTypeComposer | InterfaceTypeComposer,
): string {
  const inner = entitySelection(schemaComposer, entityTC);
  return inner ? `$.value { ${inner} }` : '$.value';
}

/**
 * Plural nav `@connect`: selection + queryParams, with child entity nav baked into
 * `$expand` / selection so Router does not need a follow-up `{$this._odataId}/…`
 * (list members often lack `@odata.id` under `odata.metadata=minimal`).
 */
function selectionAndParamsForPluralNav(
  schemaComposer: SchemaComposer,
  field: ObjectTypeComposerFieldConfig<any, any>,
): { selection: string; queryParams: string } {
  const typeName = fieldTypeNameString(field);
  const named = typeName.replace(/[[\]!]/g, '');
  const baseSelection = selectionForFieldReturnType(schemaComposer, field);
  const childNav: string[] = [];
  const inlineBits: string[] = [];
  try {
    if (schemaComposer.isObjectType(named)) {
      const childTC = schemaComposer.getOTC(named);
      const childInfo = (childTC.getExtensions() as any)?.odata?.entityInfo as
        { navigationFields?: string[] } | undefined;
      const navSet = new Set(childInfo?.navigationFields || []);
      for (const fn of childTC.getFieldNames()) {
        const f = childTC.getField(fn);
        const d = ((f.extensions as any)?.odata || {}) as ODataFieldEmit;
        const navName =
          (d.pluralNav?.navigationPropertyName as string | undefined) ||
          (navSet.has(fn) ? fn : undefined);
        if (!navName) continue;
        const inner = selectionForFieldReturnType(schemaComposer, f);
        // Expanded nav is a bare array/entity - strip `$.value { … }` wrapper.
        const bare = inner.startsWith('$.value {')
          ? inner.replace(/^\$\.value\s*\{\s*/, '').replace(/\s*\}$/, '')
          : inner.startsWith('$.value')
            ? '$'
            : inner;
        if (!bare || bare === '$') continue;
        childNav.push(navName);
        inlineBits.push(`${navName}: ${navName} { ${bare} }`);
      }
    }
  } catch {
    // keep base selection only
  }
  if (!childNav.length) {
    return { selection: baseSelection, queryParams: ODATA_QUERY_OPTIONS_QUERY_PARAMS };
  }
  const expandLiteral = childNav.join(',');
  const queryParams = `{
  "$filter": $args.queryOptions.filter
  "$orderby": $args.queryOptions.orderby
  "$top": $args.queryOptions.top
  "$skip": $args.queryOptions.skip
  "$search": $args.queryOptions.search
  "$count": $args.queryOptions.count
  "$inlinecount": $args.queryOptions.inlinecount
  "$expand": $("${expandLiteral}")
}`;
  let selection = baseSelection;
  if (selection.startsWith('$.value {') && selection.endsWith('}')) {
    const inner = selection.slice('$.value {'.length, -1).trim();
    selection = `$.value { ${inner} ${inlineBits.join(' ')} }`;
  }
  return { selection, queryParams };
}

function fieldTypeNameString(field: ObjectTypeComposerFieldConfig<any, any>): string {
  return typeof (field.type as any)?.getTypeName === 'function'
    ? (field.type as any).getTypeName()
    : String(field.type);
}

function selectionForFieldReturnType(
  schemaComposer: SchemaComposer,
  field: ObjectTypeComposerFieldConfig<any, any>,
): string {
  const typeName = fieldTypeNameString(field);
  const isList = typeName.includes('[');
  const named = typeName.replace(/[[\]!]/g, '');
  // JSON / complex: whole body. Primitive scalars (and lists of them) are wrapped
  // as `{"value": …}` in OData JSON - unwrap with `$.value`.
  if (named === 'JSON') {
    return '$';
  }
  if (named === 'Int' || named === 'Float' || named === 'Boolean') {
    return '$.value';
  }
  // Unions: `@odata.type`→`__typename` match (no field bag on the union itself).
  if (schemaComposer.isUnionType(named)) {
    try {
      const utc = schemaComposer.getUTC(named);
      const members = (utc.getTypes?.() || [])
        .map((t: any) => (typeof t === 'string' ? t : t.getTypeName?.()))
        .filter((n: unknown): n is string => typeof n === 'string');
      const defaultTypename = (utc.getExtensions() as any)?.odata?.defaultTypename as
        string | undefined;
      const spread = odataAbstractTypenameSpread(schemaComposer, members, defaultTypename);
      if (!spread) return '$';
      return isList ? `$.value { ${spread} }` : spread;
    } catch {
      return '$';
    }
  }
  let entityTC: ObjectTypeComposer | InterfaceTypeComposer | undefined;
  try {
    entityTC = schemaComposer.getAnyTC(named) as any;
  } catch {
    entityTC = undefined;
  }
  if (!entityTC || typeof (entityTC as any).getFieldNames !== 'function') {
    return '$';
  }
  if (isList) {
    return listSelection(schemaComposer, entityTC);
  }
  return entitySelection(schemaComposer, entityTC) || '$';
}

function argTypeNameOf(argConfig: { type: unknown }): string {
  return (
    typeof (argConfig.type as any)?.getTypeName === 'function'
      ? (argConfig.type as any).getTypeName()
      : String(argConfig.type)
  ).replace(/[[\]!]/g, '');
}

/** True when the GraphQL arg type is a list (e.g. `[String]` / `Collection(Edm.String)`). */
function isListArgType(argConfig: { type: unknown }): boolean {
  let t = argConfig.type as any;
  if (!t) return false;
  // Unwrap NonNullComposer so `[String!]!` is detected via the inner list name.
  while (t?.ofType && /NonNull/i.test(t.constructor?.name || '')) {
    t = t.ofType;
  }
  if (typeof t?.getTypeName === 'function') {
    const name = String(t.getTypeName());
    if (name.startsWith('[')) return true;
  }
  if (/\bList\b/i.test(t?.constructor?.name || '')) return true;
  const raw = String(
    typeof (argConfig.type as any)?.getTypeName === 'function'
      ? (argConfig.type as any).getTypeName()
      : argConfig.type,
  );
  return raw.includes('[') || /^Collection\(/i.test(raw);
}

function isInputObjectArgType(schemaComposer: SchemaComposer, argTypeName: string): boolean {
  try {
    if (schemaComposer.isEnumType(argTypeName) || schemaComposer.isScalarType(argTypeName)) {
      return false;
    }
    // SchemaComposer has no `isInputType` - resolve via InputTypeComposer.
    schemaComposer.getITC(argTypeName);
    return true;
  } catch {
    return /(Input|Instance)$/.test(argTypeName);
  }
}

/**
 * OData function call args: `(lat={$args.lat},address=@address)`.
 * Complex Inputs and collection args use parameter aliases (`@name`) so the URL
 * is not `[object Object]` / loses list shape. Binding parameter is excluded by
 * **name** (EntitySetPath / first param), not by Input type
 * (so e.g. `recipient: PersonInput` still appears).
 */
function odataCallArgsParts(
  schemaComposer: SchemaComposer,
  field: ObjectTypeComposerFieldConfig<any, any>,
  bindingParameterName?: string,
): { suffix: string; aliasQueryParams?: Record<string, string> } {
  const args = field.args || {};
  const parts: string[] = [];
  const aliasQueryParams: Record<string, string> = {};
  for (const [name, argConfig] of Object.entries(args)) {
    if (name === 'queryOptions') continue;
    if (bindingParameterName && name === bindingParameterName) continue;
    const argTypeName = argTypeNameOf(argConfig);
    // Collection(Edm.String) / [String] - keep list via alias; bare unwrap loses [].
    // Runtime JSON-encodes `@…` query values (one `@colors=["red","blue"]`, not repeats).
    if (isListArgType(argConfig) || isInputObjectArgType(schemaComposer, argTypeName)) {
      // Alias: Function(colors=@colors)?@colors={$args.colors}
      parts.push(`${name}=@${name}`);
      aliasQueryParams[`@${name}`] = `$args.${name}`;
      continue;
    }
    const isStringish =
      argTypeName === 'String' ||
      argTypeName === 'ID' ||
      argTypeName === 'GUID' ||
      schemaComposer.isEnumType(argTypeName);
    parts.push(isStringish ? `${name}='{$args.${name}}'` : `${name}={$args.${name}}`);
  }
  // OData omits `()` when there are no parameters (bound-with-only-binding-arg).
  if (!parts.length) return { suffix: '' };
  return {
    suffix: `(${parts.join(',')})`,
    ...(Object.keys(aliasQueryParams).length ? { aliasQueryParams } : {}),
  };
}

/** Append OData parameter-alias entries into a Connectors `queryParams` selection object. */
function mergeQueryParamsSelection(
  base: string | undefined,
  aliases?: Record<string, string>,
): string | undefined {
  if (!aliases || !Object.keys(aliases).length) return base;
  const aliasLines = Object.entries(aliases)
    .map(([k, v]) => `  "${k}": ${v}`)
    .join('\n');
  if (!base) {
    return `{\n${aliasLines}\n}`;
  }
  const trimmed = base.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(1, -1).trimEnd();
    return `{\n${inner}\n${aliasLines}\n}`;
  }
  return base;
}

function connectArgs(opts: {
  source: string;
  http: Record<string, unknown>;
  selection: string;
  entity?: boolean;
}) {
  // Shared `errors` / headers live on `@source` - Connectors inherit them
  // (Hive: `connect.errors || source.errors`; Apollo Router same).
  return {
    source: opts.source,
    http: opts.http,
    selection: opts.selection,
    ...(opts.entity ? { entity: true } : {}),
  };
}

/** Internal GraphQL field holding OData `@odata.id` for nested `@connect` absolute URLs. */
const ODATA_ID_FIELD = '_odataId';

export type ODataConnectSchemaMeta = {
  source: {
    name: string;
    http: Record<string, unknown>;
    errors: { message: string };
  };
  link: Array<{ url: string; import: string[] }>;
};

/**
 * Rewrite Mesh OData field directives to Federation Connectors `@connect` / `@source`,
 * and switch the subgraph to `transport-connect` (Hive `$select` via Accept odata.metadata).
 *
 * Navigation / bound ops:
 * - Types with an entity set → `/EntitySet/{$this.key}/Nav` (Apollo OData pattern)
 * - Nested-only types → `{$this._odataId}/Nav` (Hive fills `_odataId` from the
 *   request URL when `odata.metadata=minimal` omits `@odata.id`)
 */
export function emitODataConnectors(
  schemaComposer: SchemaComposer,
  opts: {
    name: string;
    endpoint: string;
    operationHeaders?: Record<string, string>;
  },
): ODataConnectSchemaMeta {
  // Full `@connect` / `@source` defs for GraphQL.js-valid printed subgraph SDL.
  // `@composeDirective(name: "@connect")` stays Guild-only.
  schemaComposer.addDirective(ConnectDirective);
  schemaComposer.addDirective(SourceDirective);
  schemaComposer.addDirective(LinkDirective);
  // Do not register a local `@key` / `@inaccessible` directive def - federation `@link` owns them.

  const sourceName = opts.name;

  // Ensure every keyed entity exposes `_odataId` before root/entity selections are built.
  for (const tc of schemaComposer.types.values()) {
    const typeName = (tc as any).getTypeName?.();
    if (typeof typeName !== 'string') continue;
    if (!schemaComposer.isObjectType(typeName) && !schemaComposer.isInterfaceType(typeName)) {
      continue;
    }
    const otc = tc as ObjectTypeComposer | InterfaceTypeComposer;
    const earlyExt = (otc.getExtensions() as any) || {};
    const entityInfo = earlyExt.odata?.entityInfo as { identifierFieldName?: string } | undefined;
    if (!entityInfo?.identifierFieldName) continue;
    if (otc.hasField(ODATA_ID_FIELD)) continue;
    otc.addFields({
      [ODATA_ID_FIELD]: {
        type: 'String',
        description: 'OData @odata.id (inaccessible; absolute URL for nested @connect paths)',
        extensions: {
          directives: { inaccessible: true },
        },
      } as any,
    });
  }
  const setConnect = (
    parent: ObjectTypeComposer | InterfaceTypeComposer | typeof schemaComposer.Query,
    fieldName: string,
    args: ReturnType<typeof connectArgs>,
  ) => {
    // Replace the field config (don't mutate shared interface/object extension bags).
    const field = parent.getField(fieldName);
    parent.setField(fieldName, {
      type: field.type,
      args: field.args,
      description: field.description,
      deprecationReason: field.deprecationReason,
      extensions: {
        directives: { connect: args },
      },
    } as any);
  };

  /** Drop emit-time odata hints from interface fields - objects own the `@connect`. */
  const clearODataFieldEmit = (
    parent: ObjectTypeComposer | InterfaceTypeComposer,
    fieldName: string,
  ) => {
    const field = parent.getField(fieldName);
    const odata = ((field.extensions as any)?.odata || {}) as ODataFieldEmit;
    if (
      !odata.pluralNav &&
      !odata.singularNav &&
      !odata.navProp &&
      !odata.boundFunction &&
      !odata.boundAction
    ) {
      return;
    }
    const dirs = ((field.extensions as any)?.directives || {}) as Record<string, unknown>;
    parent.setField(fieldName, {
      type: field.type,
      args: field.args,
      description: field.description,
      deprecationReason: field.deprecationReason,
      extensions: dirs.connect ? { directives: { connect: dirs.connect } } : {},
    } as any);
  };

  const rewriteRoot = (rootName: 'Query' | 'Mutation') => {
    const root = schemaComposer[rootName];
    for (const fieldName of root.getFieldNames()) {
      const field = root.getField(fieldName);
      const dirs = ((field.extensions as any)?.odata || {}) as ODataFieldEmit;
      const returnTypeName = field.type.getTypeName().replace(/[[\]!]/g, '');
      let entityTC: ObjectTypeComposer | InterfaceTypeComposer | undefined;
      try {
        entityTC = schemaComposer.getAnyTC(returnTypeName) as any;
      } catch {
        entityTC = undefined;
      }

      if (dirs.entitySet) {
        const entitySetName = dirs.entitySet.entitySetName;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              GET: `/${entitySetName}`,
              queryParams: ODATA_QUERY_OPTIONS_QUERY_PARAMS,
            },
            selection: entityTC ? listSelection(schemaComposer, entityTC) : '$.value',
          }),
        );
        continue;
      }

      if (dirs.entitySetByIdentifier) {
        const { entitySetName, identifierFieldName } = dirs.entitySetByIdentifier;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              // Trailing slash matches historical Mesh OData URL shape / TripPin mocks.
              GET: `/${entitySetName}/{$args.${identifierFieldName}}/`,
            },
            selection: entityTC ? entitySelection(schemaComposer, entityTC) || '$' : '$',
            // Apollo Router rejects `entity: true` on Mutation (`ENTITY_NOT_ON_ROOT_QUERY`).
            // Unions have no key fields - `entity: true` on `IPerson` etc. fails resolvable-key creation.
            entity:
              rootName === 'Query' &&
              Boolean(returnTypeName) &&
              schemaComposer.isObjectType(returnTypeName),
          }),
        );
        continue;
      }

      if (dirs.entitySetCount) {
        const entitySetName = dirs.entitySetCount.entitySetName;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              GET: `/${entitySetName}/$count`,
              queryParams: ODATA_QUERY_OPTIONS_QUERY_PARAMS,
            },
            // `$count` returns a raw integer body - selection is the root value.
            selection: '$',
          }),
        );
        continue;
      }

      if (dirs.createEntitySet) {
        const entitySetName = dirs.createEntitySet.entitySetName;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              POST: `/${entitySetName}`,
              body: '$args.input',
            },
            selection: entityTC ? entitySelection(schemaComposer, entityTC) || '$' : '$',
          }),
        );
        continue;
      }

      if (dirs.deleteEntitySet) {
        const { entitySetName, identifierFieldName } = dirs.deleteEntitySet;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              DELETE: `/${entitySetName}/{$args.${identifierFieldName}}/`,
            },
            // DELETE has an empty/non-JSON body - literal root is intentional.
            selection: '$',
          }),
        );
        continue;
      }

      if (dirs.updateEntitySet) {
        const { entitySetName, identifierFieldName } = dirs.updateEntitySet;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              PATCH: `/${entitySetName}/{$args.${identifierFieldName}}/`,
              body: '$args.input',
            },
            selection: entityTC ? entitySelection(schemaComposer, entityTC) || '$' : '$',
          }),
        );
        continue;
      }

      if (dirs.singleton) {
        const singletonName = dirs.singleton.singletonName;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: { GET: `/${singletonName}` },
            selection: entityTC ? entitySelection(schemaComposer, entityTC) || '$' : '$',
          }),
        );
        continue;
      }

      if (dirs.unboundFunction) {
        const functionName = dirs.unboundFunction.functionName as string;
        const callArgs = odataCallArgsParts(schemaComposer, field);
        const hasQueryOptions = Boolean((field.args || {}).queryOptions);
        const queryParams = mergeQueryParamsSelection(
          hasQueryOptions ? ODATA_QUERY_OPTIONS_QUERY_PARAMS : undefined,
          callArgs.aliasQueryParams,
        );
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              GET: `/${functionName}${callArgs.suffix}`,
              ...(queryParams ? { queryParams } : {}),
            },
            selection: selectionForFieldReturnType(schemaComposer, field),
          }),
        );
        continue;
      }

      if (dirs.unboundAction) {
        const actionName = dirs.unboundAction.actionName as string;
        setConnect(
          root,
          fieldName,
          connectArgs({
            source: sourceName,
            http: {
              POST: `/${actionName}`,
              body: '$args',
            },
            selection: selectionForFieldReturnType(schemaComposer, field),
          }),
        );
        continue;
      }
    }
  };

  rewriteRoot('Query');
  rewriteRoot('Mutation');

  // typeName → OData entity set (for Apollo-style `/EntitySet/{$this.key}/…` nav connects).
  const entitySetByType = new Map<string, string>();
  // Types claimed by more than one entity set - force `{$this._odataId}` nav instead of
  // guessing the wrong set (e.g. CurrentOrders vs ArchivedOrders).
  const ambiguousEntitySets = new Set<string>();
  /** First distinct entity set wins; a second different set marks the type ambiguous. */
  const rememberEntitySet = (typeName: string, entitySetName: string) => {
    if (!typeName || !entitySetName) return;
    const setOnce = (name: string) => {
      if (ambiguousEntitySets.has(name)) return;
      const existing = entitySetByType.get(name);
      if (!existing) {
        entitySetByType.set(name, entitySetName);
        return;
      }
      if (existing !== entitySetName) {
        entitySetByType.delete(name);
        ambiguousEntitySets.add(name);
      }
    };
    setOnce(typeName);
    // PeopleByUserName returns `IPerson` - stamp concrete members (Person/Manager/…).
    if (schemaComposer.isUnionType(typeName)) {
      try {
        const members = schemaComposer.getUTC(typeName).getTypes?.() || [];
        for (const m of members) {
          const n = typeof m === 'string' ? m : (m as any).getTypeName?.();
          if (typeof n === 'string') setOnce(n);
        }
      } catch {
        // ignore
      }
    }
    if (typeName.startsWith('I') && schemaComposer.isObjectType(typeName.slice(1))) {
      setOnce(typeName.slice(1));
    }
    if (schemaComposer.isInterfaceType(typeName)) {
      for (const other of schemaComposer.types.values()) {
        const otherName = (other as any).getTypeName?.();
        if (typeof otherName !== 'string' || !schemaComposer.isObjectType(otherName)) continue;
        try {
          const ifaces = (other as ObjectTypeComposer).getInterfaces?.() || [];
          if (
            ifaces.some((i: any) => (typeof i === 'string' ? i : i.getTypeName?.()) === typeName)
          ) {
            setOnce(otherName);
          }
        } catch {
          // ignore
        }
      }
    }
  };

  for (const qName of schemaComposer.Query.getFieldNames()) {
    const qField = schemaComposer.Query.getField(qName);
    const connect = (qField.extensions as any)?.directives?.connect;
    const returnName = qField.type.getTypeName().replace(/[[\]!]/g, '');
    const getPath = connect?.http?.GET as string | undefined;
    // Entity-set by-id only (`/People/{$args.UserName}/`). Do not stamp singletons
    // like `/Me` or bare `/FunctionImport` - those are not entity-set origins and
    // would falsely mark Person as ambiguous (People vs Me).
    if (getPath) {
      const byId = getPath.match(/^\/([^/]+)\/\{\$args\./);
      if (byId) {
        rememberEntitySet(returnName, byId[1]);
      }
    }
  }

  // Ambiguous types must not own `_entities`: `rewriteRoot` stamped `entity: true`
  // on by-ID Query connectors before we knew the return type was claimed by more
  // than one entity set. Clear that flag so processConnectDirectives does not
  // register resolveReference / include the type in `_Entity`.
  for (const qName of schemaComposer.Query.getFieldNames()) {
    const qField = schemaComposer.Query.getField(qName);
    const connect = (qField.extensions as any)?.directives?.connect;
    if (!connect?.entity) {
      continue;
    }
    const returnName = qField.type.getTypeName().replace(/[[\]!]/g, '');
    if (ambiguousEntitySets.has(returnName)) {
      delete connect.entity;
    }
  }

  // Entity types: `@key` + type-level `@connect` + nav/bound field `@connect`.
  for (const tc of schemaComposer.types.values()) {
    if (!('getTypeName' in tc) || typeof (tc as any).getExtensions !== 'function') {
      continue;
    }
    const typeName = (tc as ObjectTypeComposer).getTypeName();
    if (
      typeName.startsWith('__') ||
      typeName.endsWith('Input') ||
      typeName.endsWith('UpdateInput')
    ) {
      continue;
    }
    const extensions = (tc as ObjectTypeComposer).getExtensions() as any;
    const entityInfo = extensions?.odata?.entityInfo;
    if (!entityInfo) {
      continue;
    }
    const identifierFieldName = entityInfo.identifierFieldName;
    if (!identifierFieldName) {
      continue;
    }
    const isIface = schemaComposer.isInterfaceType(typeName);
    const isObject = schemaComposer.isObjectType(typeName);
    if (!isIface && !isObject) {
      continue;
    }
    const otc = tc as ObjectTypeComposer;
    const entitySetName = entitySetByType.get(typeName);

    // Field-level `@connect` for nav + bound ops.
    // Prefer entity-set relative paths (Apollo OData pattern). Nested-only types use
    // `{$this._odataId}` (Hive fills entity URL from collection+key when `@odata.id`
    // is omitted; Apollo falls back to the parent request URI for `_odataId`).
    if (isObject) {
      const basePath = entitySetName
        ? `/${entitySetName}/{$this.${identifierFieldName}}`
        : `{$this.${ODATA_ID_FIELD}}`;
      for (const fieldName of otc.getFieldNames()) {
        const field = otc.getField(fieldName);
        const fieldDirs = ((field.extensions as any)?.directives || {}) as Record<string, any>;
        const dirs = ((field.extensions as any)?.odata || {}) as ODataFieldEmit;
        if (fieldDirs.connect) {
          continue;
        }
        if (dirs.pluralNav) {
          const navName = dirs.pluralNav.navigationPropertyName as string;
          // Bake child `$expand` + selection so Apollo (no Mesh expandNavProps) and
          // Hive share one HTTP for nested entity nav (e.g. Trips→PlanItems).
          const { selection, queryParams } = selectionAndParamsForPluralNav(schemaComposer, field);
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: {
                GET: `${basePath}/${navName}`,
                queryParams,
              },
              selection,
            }),
          );
          continue;
        }
        if (dirs.navProp) {
          const navName = dirs.navProp.navigationPropertyName as string;
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: { GET: `${basePath}/${navName}` },
              selection: selectionForFieldReturnType(schemaComposer, field),
            }),
          );
          continue;
        }
        if (dirs.singularNav) {
          const navName = dirs.singularNav.navigationPropertyName as string;
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: { GET: `${basePath}/${navName}/{$args.id}/` },
              selection: selectionForFieldReturnType(schemaComposer, field),
            }),
          );
          continue;
        }
        if (dirs.boundFunction) {
          const functionRef = dirs.boundFunction.functionRef as string;
          const bindingParameterName = dirs.boundFunction.bindingParameterName as
            string | undefined;
          const callArgs = odataCallArgsParts(schemaComposer, field, bindingParameterName);
          const hasQueryOptions = Boolean((field.args || {}).queryOptions);
          const queryParams = mergeQueryParamsSelection(
            hasQueryOptions ? ODATA_QUERY_OPTIONS_QUERY_PARAMS : undefined,
            callArgs.aliasQueryParams,
          );
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: {
                GET: `${basePath}/${functionRef}${callArgs.suffix}`,
                ...(queryParams ? { queryParams } : {}),
              },
              selection: selectionForFieldReturnType(schemaComposer, field),
            }),
          );
          continue;
        }
        if (dirs.boundAction) {
          const actionRef = dirs.boundAction.actionRef as string;
          // OData action bodies exclude the binding parameter **by name**
          // (URL identifies the entity). Other Inputs (e.g. recipient: PersonInput) stay.
          const bindingParameterName = dirs.boundAction.bindingParameterName as string | undefined;
          const bodyArgs: string[] = [];
          for (const argName of Object.keys(field.args || {}) as string[]) {
            if (argName === 'queryOptions') continue;
            if (bindingParameterName && argName === bindingParameterName) continue;
            bodyArgs.push(argName);
          }
          const declaredArgCount = Object.keys(field.args || {}).length;
          const body =
            bodyArgs.length === 0
              ? '$({})'
              : bodyArgs.length === declaredArgCount
                ? '$args'
                : `$args { ${bodyArgs.join(' ')} }`;
          setConnect(
            otc,
            fieldName,
            connectArgs({
              source: sourceName,
              http: {
                POST: `${basePath}/${actionRef}`,
                body,
              },
              selection: selectionForFieldReturnType(schemaComposer, field),
            }),
          );
        }
      }
    } else if (isIface) {
      // Interface fields stay bare; implementing objects carry `@connect`.
      for (const fieldName of otc.getFieldNames()) {
        clearODataFieldEmit(otc, fieldName);
      }
    }

    // Skip redundant `IFoo` type-level `@key`/`@connect` when concrete `Foo` exists.
    if (typeName.startsWith('I') && schemaComposer.isObjectType(typeName.slice(1))) {
      continue;
    }

    const existing = [...(otc.getDirectives() || [])];
    if (isObject && !existing.some(d => d.name === 'key')) {
      // Entity-set-backed types get a resolvable `@key` + type-level `@connect(entity: true)`
      // so Hive `Query._entities` / Router entity fill work without Mesh `@merge`.
      // Nested-only or ambiguous entity sets keep `@key` (Hive `$expand` heuristics) but
      // mark `resolvable: false` - no type-level connect means this subgraph cannot own
      // `_entities` resolution (Connectors-native; mirrors stub-only `resolvable: false`).
      existing.push({
        name: 'key',
        args: {
          fields: identifierFieldName,
          ...(entitySetName ? {} : { resolvable: false }),
        },
      });
    }

    // `@connect` is OBJECT-only (Federation Connectors).
    // `entity: true` lets Router/Hive fill stubs from union match arms via `@key`.
    if (isObject && !existing.some(d => d.name === 'connect') && entitySetName) {
      existing.push({
        name: 'connect',
        args: connectArgs({
          source: sourceName,
          http: {
            GET: `/${entitySetName}/{$this.${identifierFieldName}}/`,
          },
          selection: entitySelection(schemaComposer, otc as any) || '$',
          entity: true,
        }),
      });
    }
    otc.setDirectives(existing);
  }

  // Ensure connect-only bags on fields that already have `@connect`.
  for (const tc of schemaComposer.types.values()) {
    const typeName = (tc as any).getTypeName?.();
    if (typeof typeName !== 'string') continue;
    if (!schemaComposer.isObjectType(typeName) && !schemaComposer.isInterfaceType(typeName)) {
      continue;
    }
    const typed = tc as ObjectTypeComposer | InterfaceTypeComposer;
    for (const fieldName of typed.getFieldNames()) {
      const field = typed.getField(fieldName);
      const fieldDirs = ((field.extensions as any)?.directives || {}) as Record<string, any>;
      if (!fieldDirs.connect) continue;
      typed.setFieldExtensions(fieldName, { directives: { connect: fieldDirs.connect } } as any);
    }
  }

  // Drop emit-time `extensions.odata` (entityInfo + field hints). Public SDL is Connectors-only.
  for (const tc of schemaComposer.types.values()) {
    const typed = tc as any;
    const ext = typed.getExtensions?.() as any;
    if (ext?.odata) {
      delete ext.odata;
    }
    // Root Query/Mutation fields may still carry odata hints if setConnect was skipped.
    if (typeof typed.getFieldNames === 'function' && typeof typed.getField === 'function') {
      for (const fieldName of typed.getFieldNames()) {
        const field = typed.getField(fieldName);
        const fext = (field.extensions as any) || {};
        if (fext.odata) {
          const next = { ...fext };
          delete next.odata;
          if (typeof typed.setFieldExtensions === 'function') {
            typed.setFieldExtensions(fieldName, next);
          } else if (typeof typed.setField === 'function') {
            typed.setField(fieldName, {
              type: field.type,
              args: field.args,
              description: field.description,
              deprecationReason: field.deprecationReason,
              extensions: next,
            });
          }
        }
      }
    }
  }

  const mergedHeaders = {
    Accept: ODATA_ACCEPT_METADATA,
    ...(opts.operationHeaders || {}),
  };
  // Apollo Router source headers cannot see `$args` - keep those on field `@connect`.
  const sourceHeaderEntries: Record<string, string> = {};
  const argHeaderEntries: Record<string, string> = {};
  for (const [name, value] of Object.entries(mergedHeaders)) {
    const raw = String(value);
    if (/\{args\./.test(raw) || /\{\$args\./.test(raw)) {
      argHeaderEntries[name] = raw;
    } else {
      sourceHeaderEntries[name] = raw;
    }
  }
  const headerMappings = headersToConnectMappings(sourceHeaderEntries);
  const fieldArgHeaderMappings = headersToConnectMappings(argHeaderEntries);

  /** `$args.foo` / `{args.foo}` names referenced by a header template. */
  const headerArgRefs = (value: string): string[] => {
    const names: string[] = [];
    for (const m of String(value).matchAll(/\{\$?args\.([A-Za-z_][\w]*)/g)) {
      names.push(m[1]);
    }
    return names;
  };

  /**
   * Apollo Router validates `$args` in `@connect` headers against that field's args.
   * Only attach a header onto fields that declare every referenced argument.
   */
  const attachArgHeadersIfDeclared = (
    field: ObjectTypeComposerFieldConfig<any, any>,
    setField: (name: string, f: any) => void,
    fieldName: string,
  ) => {
    const connect = (field.extensions as any)?.directives?.connect;
    if (!connect?.http || !fieldArgHeaderMappings?.length) return;
    const declared = new Set(Object.keys(field.args || {}));
    const applicable = fieldArgHeaderMappings.filter(h => {
      const refs = headerArgRefs(h.value);
      return refs.length > 0 && refs.every(r => declared.has(r));
    });
    if (!applicable.length) return;
    const existing = Array.isArray(connect.http.headers) ? connect.http.headers : [];
    // Root Query/Mutation are also visited as object composers - replace same-name
    // headers case-insensitively instead of appending duplicates.
    const next = [...existing];
    for (const header of applicable) {
      const lower = String(header.name).toLowerCase();
      const idx = next.findIndex(h => String(h?.name || '').toLowerCase() === lower);
      if (idx >= 0) {
        next[idx] = header;
      } else {
        next.push(header);
      }
    }
    connect.http.headers = next;
    setField(fieldName, {
      ...field,
      extensions: {
        ...(field.extensions || {}),
        directives: {
          ...((field.extensions as any)?.directives || {}),
          connect,
        },
      },
    });
  };

  if (fieldArgHeaderMappings?.length) {
    for (const tc of schemaComposer.types.values()) {
      const typeName = (tc as any).getTypeName?.();
      if (typeof typeName !== 'string') continue;
      if (!schemaComposer.isObjectType(typeName) && !schemaComposer.isInterfaceType(typeName)) {
        continue;
      }
      const typed = tc as ObjectTypeComposer | InterfaceTypeComposer;
      for (const fieldName of typed.getFieldNames()) {
        attachArgHeadersIfDeclared(
          typed.getField(fieldName),
          (n, f) => typed.setField(n, f),
          fieldName,
        );
      }
    }
    for (const rootName of ['Query', 'Mutation'] as const) {
      const root = schemaComposer[rootName];
      for (const fieldName of root.getFieldNames()) {
        attachArgHeadersIfDeclared(
          root.getField(fieldName),
          (n, f) => root.setField(n, f),
          fieldName,
        );
      }
    }
  }

  return {
    source: {
      name: sourceName,
      http: {
        baseURL: opts.endpoint,
        ...(headerMappings ? { headers: headerMappings } : {}),
      },
      errors: ODATA_ERROR_MAPPING,
    },
    link: [
      {
        url: CONNECT_LINK_URL,
        import: ['@connect', '@source'],
      },
      {
        url: FEDERATION_LINK_URL,
        import: ['@key', '@inaccessible'],
      },
    ],
  };
}

/**
 * Restore OData inheritance as GraphQL unions (Router Connectors reject interface
 * `implements` expand). Call after BaseType field merge, before {@link emitODataConnectors}.
 *
 * - Abstract base → union with the same name = transitive concrete descendants
 * - Non-abstract base with children → `I{Base} = Base | …descendants`; rewrite
 *   output fields typed as `Base` → `I{Base}`
 */
export function emitODataPolymorphicUnions(
  schemaComposer: SchemaComposer,
  opts: {
    abstractTypeNames: Set<string>;
    childrenByBase: Map<string, Set<string>>;
    log?: Logger;
  },
): void {
  const { abstractTypeNames, childrenByBase, log } = opts;

  function transitiveDescendants(base: string): Set<string> {
    const out = new Set<string>();
    const stack = [...(childrenByBase.get(base) || [])];
    while (stack.length) {
      const n = stack.pop()!;
      if (out.has(n)) continue;
      out.add(n);
      for (const c of childrenByBase.get(n) || []) {
        stack.push(c);
      }
    }
    return out;
  }

  function typeNameTokenRe(name: string): RegExp {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Avoid lookbehind for broader TS/downlevel targets: prefix captured in $1.
    return new RegExp(`(^|[^A-Za-z0-9_])(${esc})(?![A-Za-z0-9_])`);
  }

  function rewriteTypeName(typeStr: string, from: string, to: string): string {
    return typeStr.replace(typeNameTokenRe(from), `$1${to}`);
  }

  /** Rebind output fields (and roots) that reference `fromType` to `toType`. */
  function rewriteOutputFields(fromType: string, toType: string) {
    const re = typeNameTokenRe(fromType);
    for (const tc of schemaComposer.types.values()) {
      const typeName = (tc as any).getTypeName?.();
      if (typeof typeName !== 'string') continue;
      if (!schemaComposer.isObjectType(typeName) && !schemaComposer.isInterfaceType(typeName)) {
        continue;
      }
      const otc = tc as ObjectTypeComposer | InterfaceTypeComposer;
      for (const fieldName of otc.getFieldNames()) {
        const field = otc.getField(fieldName);
        const typeStr = fieldTypeNameString(field);
        if (!re.test(typeStr)) continue;
        // Always set a string type so graphql-compose re-resolves (important when
        // replacing an abstract object with a same-named union).
        otc.setField(fieldName, {
          ...field,
          type: rewriteTypeName(typeStr, fromType, toType),
        });
      }
    }
  }

  const bases = new Set<string>([...childrenByBase.keys(), ...abstractTypeNames]);
  for (const base of bases) {
    const descendants = transitiveDescendants(base);
    if (!descendants.size) continue;

    const isAbstract = abstractTypeNames.has(base);
    const members: string[] = [];
    if (!isAbstract && schemaComposer.isObjectType(base)) {
      members.push(base);
    }
    for (const d of [...descendants].sort()) {
      // Abstract descendants are still object composers here - exclude them so the
      // union only lists concrete members (graphql-compose would otherwise keep them).
      if (abstractTypeNames.has(d)) continue;
      if (schemaComposer.isObjectType(d) && !members.includes(d)) {
        members.push(d);
      }
    }
    // Need ≥2 members, or a single concrete child of an abstract base.
    if (members.length < 2 && !(isAbstract && members.length === 1)) {
      continue;
    }

    const unionName = isAbstract ? base : `I${base}`;
    if (!isAbstract && schemaComposer.has(unionName)) {
      log?.warn?.(`OData: skip polymorphic union ${unionName}; name already exists`);
      continue;
    }
    if (isAbstract && schemaComposer.isUnionType(base)) {
      continue;
    }

    const defaultTypename = !isAbstract && members.includes(base) ? base : members[0];

    let abstractOrphan: string | undefined;
    if (isAbstract && schemaComposer.isObjectType(base)) {
      // ListComposer wrappers keep the abstract OTC alive after `delete(name)`.
      // Rename it out of the way, create the union under the public name, rebind
      // fields to the union, then drop the orphan.
      const otc = schemaComposer.getOTC(base);
      abstractOrphan = `__ODataAbstract_${base}`;
      schemaComposer.delete(base);
      otc.setTypeName(abstractOrphan);
      schemaComposer.set(abstractOrphan, otc);
    }

    schemaComposer.createUnionTC({
      name: unionName,
      types: members,
      description: isAbstract
        ? `OData abstract type ${base} (union of concrete implementations)`
        : `OData polymorphic ${base} (union of ${base} and subtypes)`,
      extensions: {
        odata: { defaultTypename },
      },
    });

    if (abstractOrphan) {
      rewriteOutputFields(abstractOrphan, unionName);
      // Loader registered the abstract OTC via addSchemaMustHaveType; delete() alone
      // leaves it in _schemaMustHaveTypes and schema build can re-surface the orphan.
      try {
        const orphanTC = schemaComposer.getAnyTC(abstractOrphan);
        const mustHave = (schemaComposer as any)._schemaMustHaveTypes as any[] | undefined;
        if (Array.isArray(mustHave)) {
          for (let i = mustHave.length - 1; i >= 0; i--) {
            const t = mustHave[i];
            const n = t?.getTypeName?.() ?? t?.name;
            if (t === orphanTC || n === abstractOrphan) {
              mustHave.splice(i, 1);
            }
          }
        }
      } catch {
        // already gone
      }
      schemaComposer.delete(abstractOrphan);
    }

    // Non-abstract: Person → IPerson. Abstract: string refs → union (same name).
    rewriteOutputFields(base, unionName);
  }
}

export function applyODataConnectSchemaExtensions(
  schema: GraphQLSchema,
  meta: ODataConnectSchemaMeta,
  subgraphName: string,
  endpoint: string,
  odataOpts?: {
    batch?: 'none' | 'json' | 'multipart';
    expandNavProps?: boolean;
  },
) {
  const schemaExtensions: any = (schema.extensions ||= {});
  const directiveExtensions = (schemaExtensions.directives ||= {});
  directiveExtensions.source = [meta.source];
  directiveExtensions.link = [...(directiveExtensions.link || []), ...meta.link];
  delete schemaExtensions.meshConnectOptions;
  // Stamp Mesh `@transport` only when OData runtime options exist (batch /
  // expandNavProps). Otherwise Gateway infers connect from `@connect` / `@source`.
  if (odataOpts && Object.keys(odataOpts).length) {
    directiveExtensions.transport = {
      kind: 'connect',
      subgraph: subgraphName,
      location: endpoint,
      options: { odata: odataOpts },
    };
  } else {
    delete directiveExtensions.transport;
  }
}
