import {
  getNamedType,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLField,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLResolveInfo,
  type InlineFragmentNode,
  type SelectionNode,
} from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';

const ODATA_METADATA_ACCEPT_RE = /;\s*odata\.metadata\s*=/i;

/**
 * Dual-runtime OData signal: when `@source` / `@connect` send
 * `Accept: application/json;odata.metadata=…`, Apollo Router treats it as a normal
 * header; Hive enables `$select` / `$expand` projection on top of the same SDL.
 */
export function isODataMetadataAccept(headers: Record<string, string>): boolean {
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'accept' && typeof value === 'string') {
      if (ODATA_METADATA_ACCEPT_RE.test(value)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Schema-time check: `@source` / `@connect` header mappings with a literal
 * `Accept: …;odata.metadata=…` (the dual-runtime signal). Ignores `from:`
 * passthroughs — those are not the OData stamp.
 */
export function hasODataMetadataAcceptHeader(
  mappings?: Array<{ name: string; value?: string; from?: string }> | null,
): boolean {
  if (!mappings?.length) {
    return false;
  }
  for (const mapping of mappings) {
    if (
      mapping.name.toLowerCase() === 'accept' &&
      typeof mapping.value === 'string' &&
      ODATA_METADATA_ACCEPT_RE.test(mapping.value)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Map GraphQL response field names → OData/JSON property names from a Connectors
 * `selection` (simple `alias: prop` lines only; nested blocks inherit GraphQL names).
 */
export function buildConnectPropertyNameMap(selection?: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!selection) {
    return map;
  }
  for (const rawLine of selection.split('\n')) {
    const line = rawLine.trim().replace(/,$/, '');
    if (!line || line.startsWith('#') || line.startsWith('...') || line.startsWith('$')) {
      continue;
    }
    // Skip nested block openers handled via GraphQL selection walk.
    if (line.endsWith('{')) {
      const before = line.slice(0, -1).trim();
      const colon = before.indexOf(':');
      if (colon === -1) {
        const name = before.trim();
        if (name && !name.includes(' ')) {
          map.set(name, name);
        }
      } else {
        const gqlName = before.slice(0, colon).trim();
        const odataName = before.slice(colon + 1).trim();
        if (gqlName && /^[A-Za-z_][\w]*$/.test(odataName)) {
          map.set(gqlName, odataName);
        }
      }
      continue;
    }
    if (line === '}') {
      continue;
    }
    const colon = line.indexOf(':');
    if (colon === -1) {
      if (/^[A-Za-z_][\w]*$/.test(line)) {
        map.set(line, line);
      }
      continue;
    }
    const gqlName = line.slice(0, colon).trim();
    const rhs = line.slice(colon + 1).trim();
    // `userName: UserName` — not `$args…` / nested exprs.
    if (gqlName && /^[A-Za-z_][\w]*$/.test(rhs)) {
      map.set(gqlName, rhs);
    }
  }
  return map;
}

function unwrapOutputType(type: GraphQLOutputType): GraphQLOutputType {
  let t: GraphQLOutputType = type;
  while (isNonNullType(t) || isListType(t)) {
    t = t.ofType;
  }
  return t;
}

function resolveFragment(
  name: string,
  info: GraphQLResolveInfo,
): FragmentDefinitionNode | undefined {
  return info.fragments?.[name];
}

function collectSelections(
  selections: readonly SelectionNode[],
  parentType: GraphQLObjectType,
  info: GraphQLResolveInfo,
  propertyMap: Map<string, string>,
  out: { select: Set<string>; expand: string[] },
  expandNavProps: boolean,
): void {
  for (const selection of selections) {
    if (selection.kind === Kind.FIELD) {
      collectField(selection, parentType, info, propertyMap, out, expandNavProps);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      collectInlineFragment(selection, parentType, info, propertyMap, out, expandNavProps);
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const frag = resolveFragment(selection.name.value, info);
      if (!frag) continue;
      const typeName = frag.typeCondition?.name.value;
      const fragType =
        (typeName && (info.schema.getType(typeName) as GraphQLObjectType | undefined)) ||
        parentType;
      if (!isObjectType(fragType)) continue;
      collectSelections(
        frag.selectionSet.selections,
        fragType,
        info,
        propertyMap,
        out,
        expandNavProps,
      );
    }
  }
}

function collectInlineFragment(
  fragment: InlineFragmentNode,
  parentType: GraphQLObjectType,
  info: GraphQLResolveInfo,
  propertyMap: Map<string, string>,
  out: { select: Set<string>; expand: string[] },
  expandNavProps: boolean,
): void {
  // Inherited / abstract branches: OData `$select` is unsafe (same as @omnigraph/odata).
  if (fragment.typeCondition) {
    return;
  }
  collectSelections(
    fragment.selectionSet.selections,
    parentType,
    info,
    propertyMap,
    out,
    expandNavProps,
  );
}

/** Bound ops / by-id accessors / `_odataId` are not OData `$select` / `$expand` properties. */
function isODataStructuralField(
  fieldDef: GraphQLField<any, any>,
  expandNavProps: boolean,
): boolean {
  if (fieldDef.name === '_odataId') {
    return false;
  }
  const dirs = getDirectiveExtensions(fieldDef as any) || {};
  if (dirs.boundFunction?.length || dirs.boundAction?.length || dirs.singularNav?.length) {
    return false;
  }
  // Field-level `@connect` nav: only `$expand` when `expandNavProps` is on.
  // Apollo SDL stays unchanged — Router never runs this projection path.
  // Nav vs bound-op: entity `@key` target + non-callable path (no Mesh `@entityInfo`).
  if (dirs.connect?.length) {
    if (!expandNavProps) {
      return false;
    }
    return isODataExpandableField(fieldDef) && !connectPathLooksLikeCallable(dirs.connect);
  }
  // `@navProp` / `@pluralNav` are expandable; everything else without those and
  // without bound ops is treated as a structural / nav property.
  return true;
}

/**
 * Bound/unbound OData ops are namespace-qualified (`Ns.Operation` / `Ns.Operation(…)`).
 * Plain nav is a single segment (`Friends`). Do not treat `People('key')` key predicates
 * as callables — only the last path segment matters.
 */
function connectPathLooksLikeCallable(connectDirs: unknown): boolean {
  const list = Array.isArray(connectDirs) ? connectDirs : [connectDirs];
  for (const c of list) {
    const http = (c as { http?: Record<string, string> })?.http;
    if (!http || typeof http !== 'object') continue;
    for (const [method, v] of Object.entries(http)) {
      if (method === 'headers' || method === 'body' || method === 'queryParams') continue;
      if (typeof v !== 'string') continue;
      const last = v.split('?')[0].split('/').filter(Boolean).pop() || '';
      if (last.includes('.')) {
        return true;
      }
    }
  }
  return false;
}

function hasDirective(dirs: Record<string, unknown> | undefined, name: string): boolean {
  const value = dirs?.[name];
  if (value == null) {
    return false;
  }
  return Array.isArray(value) ? value.length > 0 : true;
}

function isODataExpandableField(fieldDef: GraphQLField<any, any>): boolean {
  const dirs = getDirectiveExtensions(fieldDef as any) || {};
  if (hasDirective(dirs, 'navProp') || hasDirective(dirs, 'pluralNav')) {
    return true;
  }
  // Connectors-only schemas may omit Mesh `@pluralNav` / `@navProp`. Expand only when
  // the target type is an entity (`@key`). Complex types (e.g. TripPin `AddressInfo` →
  // `Location`) are `$select`ed and returned inline — `$expand` is rejected by OData.
  const namedType = getNamedType(fieldDef.type);
  if (!isObjectType(namedType)) {
    return false;
  }
  const typeDirs = getDirectiveExtensions(namedType as any) || {};
  return hasDirective(typeDirs, 'key');
}
function collectField(
  field: FieldNode,
  parentType: GraphQLObjectType,
  info: GraphQLResolveInfo,
  propertyMap: Map<string, string>,
  out: { select: Set<string>; expand: string[] },
  expandNavProps: boolean,
): void {
  const responseName = field.alias?.value || field.name.value;
  if (responseName === '__typename' || field.name.value.startsWith('__')) {
    return;
  }
  const fieldDef = parentType.getFields()[field.name.value];
  if (!fieldDef || !isODataStructuralField(fieldDef, expandNavProps)) {
    return;
  }
  const odataName =
    propertyMap.get(responseName) || propertyMap.get(field.name.value) || field.name.value;
  const namedType = getNamedType(fieldDef.type);

  if (isLeafType(namedType)) {
    out.select.add(odataName);
    return;
  }

  if (isObjectType(namedType) && field.selectionSet) {
    if (isODataExpandableField(fieldDef)) {
      const nested = { select: new Set<string>(), expand: [] as string[] };
      collectSelections(
        field.selectionSet.selections,
        namedType,
        info,
        propertyMap,
        nested,
        expandNavProps,
      );
      const nestedParts: string[] = [];
      if (nested.select.size) {
        nestedParts.push(`$select=${[...nested.select].join(',')}`);
      }
      if (nested.expand.length) {
        nestedParts.push(`$expand=${nested.expand.join(',')}`);
      }
      out.expand.push(nestedParts.length ? `${odataName}(${nestedParts.join(';')})` : odataName);
      out.select.add(odataName);
      return;
    }
    // Complex / structured properties are `$select`ed (not `$expand`).
    out.select.add(odataName);
  }
}

/**
 * Build OData `$select` / `$expand` from the GraphQL field selection.
 * Skips when the return type is abstract (inline fragments / inheritance).
 */
export function buildODataSelectExpand(
  info: GraphQLResolveInfo,
  connectSelection?: string,
  expandNavProps = false,
): { select: string[]; expand: string[] } {
  const empty = { select: [] as string[], expand: [] as string[] };
  const returnType = unwrapOutputType(info.returnType);
  if (isAbstractType(returnType) || !isObjectType(returnType)) {
    return empty;
  }
  const propertyMap = buildConnectPropertyNameMap(connectSelection);
  const out = { select: new Set<string>(), expand: [] as string[] };
  for (const fieldNode of info.fieldNodes) {
    if (!fieldNode.selectionSet) continue;
    collectSelections(
      fieldNode.selectionSet.selections,
      returnType,
      info,
      propertyMap,
      out,
      expandNavProps,
    );
  }
  // Always include `@key` / identifier fields so entity URLs / bound ops keep working.
  const keyDirs = getDirectiveExtensions(returnType as any)?.key;
  if (Array.isArray(keyDirs)) {
    for (const key of keyDirs) {
      const fields = typeof key?.fields === 'string' ? key.fields.split(/\s+/) : [];
      for (const f of fields) {
        if (f) out.select.add(f);
      }
    }
  }
  return {
    select: [...out.select],
    expand: out.expand,
  };
}

function pathAlreadyHasODataProjection(fullPath: string): boolean {
  try {
    const abs = /^https?:\/\//i.test(fullPath);
    const url = abs ? new URL(fullPath) : new URL(fullPath, 'http://mesh.local/');
    return url.searchParams.has('$select') || url.searchParams.has('$expand');
  } catch {
    return /(?:\?|&)\$(?:select|expand)=/i.test(fullPath);
  }
}

/**
 * When Accept signals OData metadata, append `$select` / `$expand` derived from the
 * GraphQL selection (transport-rest path; Apollo Router never runs this).
 */
export function appendODataSelectExpand(
  fullPath: string,
  info: GraphQLResolveInfo,
  connectSelection?: string,
  expandNavProps = false,
): string {
  if (pathAlreadyHasODataProjection(fullPath)) {
    return fullPath;
  }
  const { select, expand } = buildODataSelectExpand(info, connectSelection, expandNavProps);
  if (!select.length && !expand.length) {
    return fullPath;
  }
  const abs = /^https?:\/\//i.test(fullPath);
  let url: URL;
  try {
    url = abs ? new URL(fullPath) : new URL(fullPath, 'http://mesh.local/');
  } catch {
    return fullPath;
  }
  if (select.length) {
    url.searchParams.set('$select', select.join(','));
  }
  if (expand.length) {
    url.searchParams.set('$expand', expand.join(','));
  }
  if (abs) {
    return url.toString();
  }
  const leadingSlash = fullPath.startsWith('/');
  let pathPart = url.pathname;
  if (!leadingSlash && pathPart.startsWith('/')) {
    pathPart = pathPart.slice(1);
  }
  return `${pathPart}${url.search}`;
}

/**
 * After Connectors `selection` drops unmapped keys, re-attach `$expand`ed navigation
 * properties the GraphQL query asked for so field `@connect` resolvers can prefer them.
 */
export function attachExpandedNavFromRaw(
  selected: unknown,
  raw: unknown,
  info: GraphQLResolveInfo,
  expandNavProps: boolean,
): unknown {
  if (!expandNavProps || selected == null || typeof selected !== 'object') {
    return selected;
  }
  const returnType = unwrapOutputType(info.returnType);
  if (!isObjectType(returnType)) {
    return selected;
  }
  const navNames: string[] = [];
  for (const fieldNode of info.fieldNodes) {
    if (!fieldNode.selectionSet) continue;
    for (const sel of fieldNode.selectionSet.selections) {
      if (sel.kind !== Kind.FIELD) continue;
      const fieldDef = returnType.getFields()[sel.name.value];
      if (!fieldDef) continue;
      if (!isODataStructuralField(fieldDef, true)) continue;
      if (!isODataExpandableField(fieldDef)) continue;
      navNames.push(sel.alias?.value || sel.name.value);
    }
  }
  if (!navNames.length) {
    return selected;
  }

  const lookupRaw = (rawEntity: Record<string, unknown>, name: string) => {
    if (rawEntity[name] != null) return rawEntity[name];
    // GraphQL field may be camelCase while OData JSON uses PascalCase (`friends` / `Friends`).
    const found = Object.keys(rawEntity).find(k => k.toLowerCase() === name.toLowerCase());
    return found != null ? rawEntity[found] : undefined;
  };

  const attachOne = (sel: Record<string, unknown>, rawEntity: Record<string, unknown>) => {
    for (const name of navNames) {
      if (sel[name] != null) continue;
      const fromRaw = lookupRaw(rawEntity, name);
      if (fromRaw != null) {
        sel[name] = fromRaw;
      }
    }
    return sel;
  };

  if (Array.isArray(selected)) {
    const rawItems = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { value?: unknown })?.value)
        ? ((raw as { value: unknown[] }).value as unknown[])
        : null;
    return selected.map((item, i) => {
      if (item == null || typeof item !== 'object') return item;
      const rawItem = rawItems?.[i];
      if (rawItem == null || typeof rawItem !== 'object') return item;
      return attachOne(item as Record<string, unknown>, rawItem as Record<string, unknown>);
    });
  }

  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return selected;
  }
  return attachOne(selected as Record<string, unknown>, raw as Record<string, unknown>);
}
