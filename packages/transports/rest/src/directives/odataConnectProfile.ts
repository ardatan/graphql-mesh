import {
  getNamedType,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
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

export type ConnectPropertyMapNode = {
  map: Map<string, string>;
  children: Map<string, ConnectPropertyMapNode>;
};

/**
 * Map GraphQL field names -> OData/JSON property names from a Connectors `selection`.
 * Nested `{ … }` blocks become child maps so `id: PersonId` and `friends { id: FriendId }`
 * do not collide.
 */
export function buildConnectPropertyNameMapTree(selection?: string): ConnectPropertyMapNode {
  const root: ConnectPropertyMapNode = { map: new Map(), children: new Map() };
  if (!selection) {
    return root;
  }
  parseConnectPropertyBlock(selection, root);
  return root;
}

/** Flat top-level map (backward compatible). */
export function buildConnectPropertyNameMap(selection?: string): Map<string, string> {
  return buildConnectPropertyNameMapTree(selection).map;
}

function parseConnectPropertyBlock(selection: string, node: ConnectPropertyMapNode): void {
  const s = selection.trim();
  let i = 0;
  const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
  const isIdent = (c: string) => /[A-Za-z0-9_]/.test(c);
  while (i < s.length) {
    while (i < s.length && /\s|,/.test(s[i])) i++;
    if (i >= s.length) break;
    if (s.startsWith('...', i)) {
      // Skip abstract spreads / method chains until next top-level field.
      i += 3;
      while (i < s.length) {
        if (s[i] === '(' || s[i] === '[' || s[i] === '{') {
          const open = s[i];
          const close = open === '(' ? ')' : open === '[' ? ']' : '}';
          let depth = 0;
          for (; i < s.length; i++) {
            if (s[i] === open) depth++;
            else if (s[i] === close) {
              depth--;
              if (depth === 0) {
                i++;
                break;
              }
            }
          }
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
      continue;
    }
    if (!isIdentStart(s[i])) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < s.length && isIdent(s[j])) j++;
    const gqlName = s.slice(i, j);
    i = j;
    while (i < s.length && /\s/.test(s[i])) i++;
    let odataName = gqlName;
    if (s[i] === ':') {
      i++;
      while (i < s.length && /\s/.test(s[i])) i++;
      if (i < s.length && isIdentStart(s[i])) {
        let k = i + 1;
        while (k < s.length && isIdent(s[k])) k++;
        odataName = s.slice(i, k);
        i = k;
        while (i < s.length && /\s/.test(s[i])) i++;
      }
    }
    if (gqlName !== 'get') {
      node.map.set(gqlName, odataName);
    }
    if (s[i] === '{') {
      let depth = 0;
      const start = i + 1;
      for (; i < s.length; i++) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      const inner = s.slice(start, i);
      i++; // past closing }
      const child: ConnectPropertyMapNode = { map: new Map(), children: new Map() };
      parseConnectPropertyBlock(inner, child);
      node.children.set(gqlName, child);
    }
  }
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
  propertyNode: ConnectPropertyMapNode,
  out: { select: Set<string>; expand: string[] },
  expandNavProps: boolean,
): void {
  for (const selection of selections) {
    if (selection.kind === Kind.FIELD) {
      collectField(selection, parentType, info, propertyNode, out, expandNavProps);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      collectInlineFragment(selection, parentType, info, propertyNode, out, expandNavProps);
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const frag = resolveFragment(selection.name.value, info);
      if (!frag) continue;
      const typeName = frag.typeCondition?.name.value;
      const fragType =
        (typeName && (info.schema.getType(typeName) as GraphQLObjectType | undefined)) ||
        parentType;
      if (!isObjectType(fragType) || fragType.name !== parentType.name) {
        // Abstract / sibling-type fragments make partial `$select` unsafe.
        out.select.add('__odata_projection_unsafe__');
        continue;
      }
      collectSelections(
        frag.selectionSet.selections,
        fragType,
        info,
        propertyNode,
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
  propertyNode: ConnectPropertyMapNode,
  out: { select: Set<string>; expand: string[] },
  expandNavProps: boolean,
): void {
  if (fragment.typeCondition) {
    const typeName = fragment.typeCondition.name.value;
    // Same concrete type (or typeless) — include fields. Other type conditions
    // (interfaces / sibling objects) make `$select` unsafe; caller must skip projection.
    if (typeName !== parentType.name) {
      out.select.add('__odata_projection_unsafe__');
      return;
    }
  }
  collectSelections(
    fragment.selectionSet.selections,
    parentType,
    info,
    propertyNode,
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
  // Connectors-only schemas may omit Mesh `@pluralNav` / `@navProp`. Expand when the
  // target is an entity (`@key`) or a polymorphic entity union (`IPerson` / `IPlanItem`).
  // Complex types (e.g. TripPin `AddressInfo` → `Location`) stay `$select`-only.
  const namedType = getNamedType(fieldDef.type);
  if (isObjectType(namedType)) {
    const typeDirs = getDirectiveExtensions(namedType as any) || {};
    return hasDirective(typeDirs, 'key');
  }
  if (isUnionType(namedType)) {
    return namedType.getTypes().some(t => {
      if (!isObjectType(t)) return false;
      const typeDirs = getDirectiveExtensions(t as any) || {};
      return hasDirective(typeDirs, 'key');
    });
  }
  // Interfaces without schema.getPossibleTypes — treat as expandable when abstract.
  return isAbstractType(namedType);
}
function expandOptionsFromFieldArgs(field: FieldNode): string[] {
  const parts: string[] = [];
  if (!field.arguments?.length) return parts;
  for (const arg of field.arguments) {
    if (arg.name.value !== 'queryOptions' || arg.value.kind !== Kind.OBJECT) continue;
    for (const f of arg.value.fields) {
      const key = f.name.value;
      const odataKey =
        key === 'top'
          ? '$top'
          : key === 'skip'
            ? '$skip'
            : key === 'filter'
              ? '$filter'
              : key === 'orderby'
                ? '$orderby'
                : key === 'search'
                  ? '$search'
                  : key === 'count'
                    ? '$count'
                    : key === 'inlinecount'
                      ? '$inlinecount'
                      : null;
      if (!odataKey) continue;
      if (f.value.kind === Kind.INT || f.value.kind === Kind.FLOAT) {
        parts.push(`${odataKey}=${f.value.value}`);
      } else if (f.value.kind === Kind.STRING) {
        parts.push(`${odataKey}=${f.value.value}`);
      } else if (f.value.kind === Kind.BOOLEAN) {
        parts.push(`${odataKey}=${f.value.value}`);
      }
    }
  }
  // Non-queryOptions args cannot be expressed in `$expand` - caller should skip expand.
  const hasOtherArgs = field.arguments.some(a => a.name.value !== 'queryOptions');
  if (hasOtherArgs) {
    return ['__odata_expand_unsupported__'];
  }
  return parts;
}

function collectField(
  field: FieldNode,
  parentType: GraphQLObjectType,
  info: GraphQLResolveInfo,
  propertyNode: ConnectPropertyMapNode,
  out: { select: Set<string>; expand: string[] },
  expandNavProps: boolean,
): void {
  if (field.name.value.startsWith('__')) {
    return;
  }
  const fieldDef = parentType.getFields()[field.name.value];
  if (!fieldDef || !isODataStructuralField(fieldDef, expandNavProps)) {
    return;
  }
  // Aliases change the response key only - map by schema field name.
  const odataName = propertyNode.map.get(field.name.value) || field.name.value;
  const childNode = propertyNode.children.get(field.name.value) || {
    map: new Map<string, string>(),
    children: new Map(),
  };
  const namedType = getNamedType(fieldDef.type);

  if (isLeafType(namedType)) {
    out.select.add(odataName);
    return;
  }

  const pushExpand = (
    member: GraphQLObjectType,
    nested: { select: Set<string>; expand: string[] },
  ) => {
    const argOpts = expandOptionsFromFieldArgs(field);
    if (argOpts.includes('__odata_expand_unsupported__')) {
      // Keep a separate `@connect` request so nav args still apply.
      return;
    }
    addEntityKeySelects(member, childNode.map, nested.select);
    const nestedParts: string[] = [...argOpts];
    if (nested.select.size) {
      nestedParts.push(`$select=${[...nested.select].join(',')}`);
    }
    if (nested.expand.length) {
      nestedParts.push(`$expand=${nested.expand.join(',')}`);
    }
    out.expand.push(nestedParts.length ? `${odataName}(${nestedParts.join(';')})` : odataName);
    out.select.add(odataName);
  };

  // Entity unions (`IPerson`, `IPlanItem`) can still `$expand` via a representative
  // `@key` member. Non-entity abstracts (e.g. Location unions) stay `$select`-only -
  // nested shape comes from the Connectors selection, not OData column lists.
  if (isAbstractType(namedType)) {
    const member =
      expandNavProps && isODataExpandableField(fieldDef) && field.selectionSet
        ? pickEntityMemberType(namedType)
        : null;
    if (member && field.selectionSet) {
      const nested = { select: new Set<string>(), expand: [] as string[] };
      collectSelections(
        field.selectionSet.selections,
        member,
        info,
        childNode,
        nested,
        expandNavProps,
      );
      if (nested.select.has('__odata_projection_unsafe__')) {
        out.select.add('__odata_projection_unsafe__');
        return;
      }
      pushExpand(member, nested);
      return;
    }
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
        childNode,
        nested,
        expandNavProps,
      );
      if (nested.select.has('__odata_projection_unsafe__')) {
        out.select.add('__odata_projection_unsafe__');
        return;
      }
      pushExpand(namedType, nested);
      return;
    }
    // Complex / structured properties are `$select`ed (not `$expand`).
    out.select.add(odataName);
  }
}

/** First `@key` object member of a union (entity polymorphism), else first object. */
function pickEntityMemberType(type: GraphQLOutputType): GraphQLObjectType | null {
  const named = getNamedType(type);
  if (isObjectType(named)) {
    return named;
  }
  if (!isUnionType(named)) {
    return null;
  }
  const objects = named.getTypes().filter(isObjectType);
  return (
    objects.find(t => hasDirective(getDirectiveExtensions(t as any) || {}, 'key')) ||
    objects[0] ||
    null
  );
}

function addEntityKeySelects(
  entityType: GraphQLObjectType,
  propertyMap: Map<string, string>,
  select: Set<string>,
): void {
  const nestedKeyDirs = getDirectiveExtensions(entityType as any)?.key;
  if (!Array.isArray(nestedKeyDirs)) {
    return;
  }
  for (const key of nestedKeyDirs) {
    const fields = typeof key?.fields === 'string' ? key.fields.split(/\s+/) : [];
    for (const f of fields) {
      if (f) select.add(propertyMap.get(f) || f);
    }
  }
}

/**
 * Build OData `$select` / `$expand` from the GraphQL field selection.
 * Entity unions (`IPerson`) project via a representative `@key` member so
 * `expandNavProps` still emits `$expand` (e.g. TripPin `Me` → `Trips`).
 */
export function buildODataSelectExpand(
  info: GraphQLResolveInfo,
  connectSelection?: string,
  expandNavProps = false,
): { select: string[]; expand: string[] } {
  const empty = { select: [] as string[], expand: [] as string[] };
  const returnType = unwrapOutputType(info.returnType);
  const projectionType = isObjectType(returnType) ? returnType : pickEntityMemberType(returnType);
  if (!projectionType) {
    return empty;
  }
  const propertyNode = buildConnectPropertyNameMapTree(connectSelection);
  const out = { select: new Set<string>(), expand: [] as string[] };
  for (const fieldNode of info.fieldNodes) {
    if (!fieldNode.selectionSet) continue;
    collectSelections(
      fieldNode.selectionSet.selections,
      projectionType,
      info,
      propertyNode,
      out,
      expandNavProps,
    );
  }
  if (out.select.has('__odata_projection_unsafe__')) {
    return empty;
  }
  // Always include `@key` / identifier fields so entity URLs / bound ops keep working.
  // Translate GraphQL key field names through the connector property map.
  addEntityKeySelects(projectionType, propertyNode.map, out.select);
  return {
    select: [...out.select],
    expand: mergeExpandItems(out.expand),
  };
}

/** OData forbids repeating the same navigation path in `$expand` — merge nested options. */
function mergeExpandItems(items: string[]): string[] {
  const byPath = new Map<
    string,
    { select: Set<string>; expand: string[]; other: Map<string, string> }
  >();
  const bare: string[] = [];
  for (const item of items) {
    const m = item.match(/^([^(]+)(?:\((.*)\))?$/);
    if (!m) {
      bare.push(item);
      continue;
    }
    const path = m[1];
    const opts = m[2];
    if (!opts) {
      if (!byPath.has(path)) {
        byPath.set(path, { select: new Set(), expand: [], other: new Map() });
      }
      continue;
    }
    const entry = byPath.get(path) || {
      select: new Set<string>(),
      expand: [] as string[],
      other: new Map<string, string>(),
    };
    for (const part of opts.split(';')) {
      if (part.startsWith('$select=')) {
        for (const f of part.slice('$select='.length).split(',')) {
          if (f) entry.select.add(f);
        }
      } else if (part.startsWith('$expand=')) {
        entry.expand.push(...part.slice('$expand='.length).split(',').filter(Boolean));
      } else if (part.includes('=')) {
        // Preserve $top / $filter / $orderby / … from navigation queryOptions.
        const eq = part.indexOf('=');
        entry.other.set(part.slice(0, eq), part.slice(eq + 1));
      }
    }
    byPath.set(path, entry);
  }
  const merged = [...byPath.entries()].map(([path, entry]) => {
    const nestedParts: string[] = [];
    for (const [k, v] of entry.other) {
      nestedParts.push(`${k}=${v}`);
    }
    if (entry.select.size) nestedParts.push(`$select=${[...entry.select].join(',')}`);
    if (entry.expand.length) {
      nestedParts.push(`$expand=${mergeExpandItems(entry.expand).join(',')}`);
    }
    return nestedParts.length ? `${path}(${nestedParts.join(';')})` : path;
  });
  return [...merged, ...bare];
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
  // Prefer concrete `__typename` after union match; else a representative `@key` member.
  let objectType: GraphQLObjectType | null = null;
  if (isObjectType(returnType)) {
    objectType = returnType;
  } else {
    const typename =
      !Array.isArray(selected) &&
      typeof (selected as { __typename?: unknown }).__typename === 'string'
        ? (selected as { __typename: string }).__typename
        : null;
    if (typename) {
      const fromSchema = info.schema.getType(typename);
      if (isObjectType(fromSchema)) {
        objectType = fromSchema;
      }
    }
    objectType ||= pickEntityMemberType(returnType);
  }
  if (!objectType) {
    return selected;
  }
  // Attach under the schema field name (resolvers read `root.friends`, not the alias).
  // Skip nav fields with non-queryOptions args - those were excluded from `$expand`
  // and must not be prefer-embedded (connector applies limit/filter via its own GET).
  const navFields: Array<{ schemaName: string; responseName: string }> = [];
  for (const fieldNode of info.fieldNodes) {
    if (!fieldNode.selectionSet) continue;
    for (const sel of fieldNode.selectionSet.selections) {
      if (sel.kind !== Kind.FIELD) continue;
      if (sel.arguments?.some(a => a.name.value !== 'queryOptions')) continue;
      const fieldDef = objectType.getFields()[sel.name.value];
      if (!fieldDef) continue;
      if (!isODataStructuralField(fieldDef, true)) continue;
      if (!isODataExpandableField(fieldDef)) continue;
      navFields.push({
        schemaName: sel.name.value,
        responseName: sel.alias?.value || sel.name.value,
      });
    }
  }
  if (!navFields.length) {
    return selected;
  }

  const lookupRaw = (rawEntity: Record<string, unknown>, name: string) => {
    if (rawEntity[name] != null) return rawEntity[name];
    // GraphQL field may be camelCase while OData JSON uses PascalCase (`friends` / `Friends`).
    const found = Object.keys(rawEntity).find(k => k.toLowerCase() === name.toLowerCase());
    return found != null ? rawEntity[found] : undefined;
  };

  const attachOne = (sel: Record<string, unknown>, rawEntity: Record<string, unknown>) => {
    for (const { schemaName, responseName } of navFields) {
      if (sel[schemaName] != null || sel[responseName] != null) continue;
      const fromRaw = lookupRaw(rawEntity, schemaName) ?? lookupRaw(rawEntity, responseName);
      if (fromRaw != null) {
        sel[schemaName] = fromRaw;
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
