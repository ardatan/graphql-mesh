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
  type ValueNode,
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
  /** True when selection uses non-identifier RHS (`$.X`, `$("Y")`, exprs) — skip `$select`. */
  projectionUnsafe?: boolean;
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
  // `$.value { userName: UserName }` nests the entity map under `value` (and may also
  // map identity `value → value`). Projection reads the root map — promote the
  // list-wrapper child when it is the only structural content.
  const onlyValueChild = root.children.size === 1 && root.children.has('value');
  const mapOnlyValueIdentity =
    root.map.size === 0 || (root.map.size === 1 && root.map.get('value') === 'value');
  if (onlyValueChild && mapOnlyValueIdentity) {
    return root.children.get('value')!;
  }
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
    let skipMap = false;
    if (s[i] === ':') {
      i++;
      while (i < s.length && /\s/.test(s[i])) i++;
      if (i < s.length && isIdentStart(s[i])) {
        let k = i + 1;
        while (k < s.length && isIdent(s[k])) k++;
        odataName = s.slice(i, k);
        i = k;
        while (i < s.length && /\s/.test(s[i])) i++;
      } else if (i < s.length && (s[i] === '$' || s[i] === '(' || s[i] === '.')) {
        // Connector exprs: `__typename: $("T")`, `_odataId: $->get("@odata.id")`,
        // `displayName: $.FirstName`. Never invent a `$select` key from the GraphQL
        // alias alone. Synthetic fields are skipped; `$.Wire` remaps to Wire; other
        // exprs make projection unsafe for this subtree.
        const exprStart = i;
        if (s[i] === '$' && s[i + 1] === '.') {
          // `$.FirstName` → FirstName. Multi-segment `$.Address.City` must `$select`
          // the root property `Address` (or mark unsafe) — never invent `City` alone.
          i += 2;
          const segments: string[] = [];
          while (i < s.length && !/[\s,{]/.test(s[i])) {
            if (isIdentStart(s[i])) {
              let k = i + 1;
              while (k < s.length && isIdent(s[k])) k++;
              segments.push(s.slice(i, k));
              i = k;
            } else if (s[i] === '.') {
              i++;
            } else {
              i++;
            }
          }
          if (segments.length === 1) {
            odataName = segments[0];
          } else if (segments.length > 1) {
            odataName = segments[0];
          } else {
            skipMap = true;
            node.projectionUnsafe = true;
          }
        } else {
          // `$("…")`, `$->get(…)`, `$(…)` — consume the expression.
          skipMap = true;
          if (gqlName !== '__typename' && gqlName !== '_odataId') {
            node.projectionUnsafe = true;
          }
          if (s[i] === '$' && s[i + 1] === '(') {
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
          } else if (s[i] === '$' || s[i] === '.') {
            while (i < s.length && !/[\s,{]/.test(s[i])) i++;
            // `$->get("…")` may be followed by `(...)` — consume it.
            while (i < s.length && /\s/.test(s[i])) i++;
            if (i < s.length && s[i] === '(') {
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
          } else {
            // Bare `(` — should not appear as a property RHS; mark unsafe.
            node.projectionUnsafe = true;
            i = exprStart;
          }
        }
        while (i < s.length && /\s/.test(s[i])) i++;
      }
    }
    if (!skipMap && gqlName !== 'get') {
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
      if (child.projectionUnsafe) {
        node.projectionUnsafe = true;
      }
      node.children.set(gqlName, child);
    }
  }
}

/**
 * Split on `sep` that are not inside `(...)` option lists or quoted string values
 * (`$filter=Name eq 'A;B'` / `startswith(Name,'(')` must stay one part).
 */
export function splitTopLevel(s: string, sep: ',' | ';'): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      // OData single-quoted strings escape a quote by doubling it.
      if (c === quote) {
        if (quote === "'" && s[i + 1] === "'") {
          i++;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === sep && depth === 0) {
      const part = s.slice(start, i).trim();
      if (part) parts.push(part);
      start = i + 1;
    }
  }
  const last = s.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

/** Split on commas that are not inside `(...)` option lists. */
export function splitTopLevelComma(s: string): string[] {
  return splitTopLevel(s, ',');
}

/** Split on semicolons that are not inside nested `(...)` option lists. */
export function splitTopLevelSemicolon(s: string): string[] {
  return splitTopLevel(s, ';');
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
function queryOptionsKeyToOData(key: string): string | null {
  switch (key) {
    case 'top':
      return '$top';
    case 'skip':
      return '$skip';
    case 'filter':
      return '$filter';
    case 'orderby':
      return '$orderby';
    case 'search':
      return '$search';
    case 'count':
      return '$count';
    case 'inlinecount':
      return '$inlinecount';
    default:
      return null;
  }
}

/** Fold a resolved JS queryOptions object into `$expand` option parts. */
function expandPartsFromQueryOptionsObject(obj: Record<string, unknown>): string[] | null {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const odataKey = queryOptionsKeyToOData(key);
    if (!odataKey) continue;
    if (value == null) {
      return null;
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
      parts.push(`${odataKey}=${value}`);
    } else {
      parts.push(`${odataKey}=${String(value)}`);
    }
  }
  return parts;
}

function expandOptionsFromFieldArgs(field: FieldNode, info: GraphQLResolveInfo): string[] {
  const parts: string[] = [];
  if (!field.arguments?.length) return parts;
  for (const arg of field.arguments) {
    if (arg.name.value !== 'queryOptions') continue;
    // Whole-object variable: `friends(queryOptions: $options)`.
    if (arg.value.kind === Kind.VARIABLE) {
      const vars = info.variableValues || {};
      const name = arg.value.name.value;
      if (!Object.prototype.hasOwnProperty.call(vars, name) || vars[name] == null) {
        return ['__odata_expand_unsupported__'];
      }
      const resolved = vars[name];
      if (typeof resolved !== 'object' || Array.isArray(resolved)) {
        return ['__odata_expand_unsupported__'];
      }
      const fromObj = expandPartsFromQueryOptionsObject(resolved as Record<string, unknown>);
      if (fromObj == null) {
        return ['__odata_expand_unsupported__'];
      }
      parts.push(...fromObj);
      continue;
    }
    if (arg.value.kind !== Kind.OBJECT) {
      return ['__odata_expand_unsupported__'];
    }
    for (const f of arg.value.fields) {
      const odataKey = queryOptionsKeyToOData(f.name.value);
      if (!odataKey) continue;
      const lit = graphqlValueToExpandLiteral(f.value, info);
      if (lit === null) {
        // Unresolved variable — fall back to a dedicated nav GET.
        return ['__odata_expand_unsupported__'];
      }
      parts.push(`${odataKey}=${lit}`);
    }
  }
  // Non-queryOptions args cannot be expressed in `$expand` - caller should skip expand.
  const hasOtherArgs = field.arguments.some(a => a.name.value !== 'queryOptions');
  if (hasOtherArgs) {
    return ['__odata_expand_unsupported__'];
  }
  return parts;
}

/** Resolve a GraphQL value node for `$expand` options; null = unresolved variable. */
function graphqlValueToExpandLiteral(value: ValueNode, info: GraphQLResolveInfo): string | null {
  if (value.kind === Kind.INT || value.kind === Kind.FLOAT) {
    return String(value.value);
  }
  if (value.kind === Kind.STRING) {
    return value.value;
  }
  if (value.kind === Kind.BOOLEAN) {
    return String(value.value);
  }
  if (value.kind === Kind.NULL) {
    return 'null';
  }
  if (value.kind === Kind.ENUM) {
    return value.value;
  }
  if (value.kind === Kind.VARIABLE) {
    const vars = info.variableValues || {};
    if (!Object.prototype.hasOwnProperty.call(vars, value.name.value)) {
      return null;
    }
    const v = vars[value.name.value];
    if (v == null) {
      return null;
    }
    if (typeof v === 'boolean' || typeof v === 'number') {
      return String(v);
    }
    return String(v);
  }
  // Objects / lists in queryOptions are not representable in `$expand` options.
  return null;
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
    const argOpts = expandOptionsFromFieldArgs(field, info);
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
  if (propertyNode.projectionUnsafe) {
    // Selection remaps via unresolved connector exprs — do not invent `$select` names.
    return empty;
  }
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

function expandOtherFingerprint(other: Map<string, string>): string {
  return [...other.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join(';');
}

/** OData forbids repeating the same navigation path in `$expand` — merge nested options. */
function mergeExpandItems(items: string[]): string[] {
  const byPath = new Map<
    string,
    { select: Set<string>; expand: string[]; other: Map<string, string> }
  >();
  const bare: string[] = [];
  /** Paths whose `$top`/`$filter`/… sets conflict across aliases — omit from `$expand`. */
  const conflictingPaths = new Set<string>();
  for (const item of items) {
    const m = item.match(/^([^(]+)(?:\((.*)\))?$/);
    if (!m) {
      bare.push(item);
      continue;
    }
    const path = m[1];
    const opts = m[2];
    if (!opts) {
      if (!byPath.has(path) && !conflictingPaths.has(path)) {
        byPath.set(path, { select: new Set(), expand: [], other: new Map() });
      }
      continue;
    }
    if (conflictingPaths.has(path)) {
      continue;
    }
    const incomingOther = new Map<string, string>();
    const incomingSelect = new Set<string>();
    const incomingExpand: string[] = [];
    // Nesting-aware: do not split on `;` inside `Trips($top=2;$select=TripId,Name)`.
    for (const part of splitTopLevelSemicolon(opts)) {
      if (part.startsWith('$select=')) {
        for (const f of splitTopLevelComma(part.slice('$select='.length))) {
          if (f) incomingSelect.add(f);
        }
      } else if (part.startsWith('$expand=')) {
        // Nesting-aware: `$expand=PlanItems($select=TripId,Name),Friends` must not
        // split on the comma inside `$select=...`.
        incomingExpand.push(...splitTopLevelComma(part.slice('$expand='.length)));
      } else if (part.includes('=')) {
        // Preserve $top / $filter / $orderby / ... from navigation queryOptions.
        const eq = part.indexOf('=');
        incomingOther.set(part.slice(0, eq), part.slice(eq + 1));
      }
    }
    const entry = byPath.get(path);
    if (entry) {
      const existingFp = expandOtherFingerprint(entry.other);
      const incomingFp = expandOtherFingerprint(incomingOther);
      // Different nav arg sets (e.g. $top=1 vs $top=2) must not share one expand —
      // drop the path so each alias uses a dedicated `@connect` GET.
      if (existingFp !== incomingFp && (existingFp || incomingFp)) {
        byPath.delete(path);
        conflictingPaths.add(path);
        continue;
      }
      for (const f of incomingSelect) entry.select.add(f);
      entry.expand.push(...incomingExpand);
      for (const [k, v] of incomingOther) entry.other.set(k, v);
    } else {
      byPath.set(path, {
        select: incomingSelect,
        expand: incomingExpand,
        other: incomingOther,
      });
    }
  }
  const merged = [...byPath.entries()].map(([path, entry]) => {
    const nestedParts: string[] = [];
    for (const [k, v] of entry.other) {
      nestedParts.push(`${k}=${v}`);
    }
    if (entry.select.size) nestedParts.push(`$select=${[...entry.select].join(',')}`);
    const nestedExpand = mergeExpandItems(entry.expand);
    if (nestedExpand.length) {
      nestedParts.push(`$expand=${nestedExpand.join(',')}`);
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
 * GraphQL selection (transport-connect path; Apollo Router never runs this).
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
