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
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLResolveInfo,
  type InlineFragmentNode,
  type SelectionNode,
} from 'graphql';

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
): void {
  for (const selection of selections) {
    if (selection.kind === Kind.FIELD) {
      collectField(selection, parentType, info, propertyMap, out);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      collectInlineFragment(selection, parentType, info, propertyMap, out);
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const frag = resolveFragment(selection.name.value, info);
      if (!frag) continue;
      const typeName = frag.typeCondition?.name.value;
      const fragType =
        (typeName && (info.schema.getType(typeName) as GraphQLObjectType | undefined)) || parentType;
      if (!isObjectType(fragType)) continue;
      collectSelections(frag.selectionSet.selections, fragType, info, propertyMap, out);
    }
  }
}

function collectInlineFragment(
  fragment: InlineFragmentNode,
  parentType: GraphQLObjectType,
  info: GraphQLResolveInfo,
  propertyMap: Map<string, string>,
  out: { select: Set<string>; expand: string[] },
): void {
  // Inherited / abstract branches: OData `$select` is unsafe (same as @omnigraph/odata).
  if (fragment.typeCondition) {
    return;
  }
  collectSelections(fragment.selectionSet.selections, parentType, info, propertyMap, out);
}

function collectField(
  field: FieldNode,
  parentType: GraphQLObjectType,
  info: GraphQLResolveInfo,
  propertyMap: Map<string, string>,
  out: { select: Set<string>; expand: string[] },
): void {
  const responseName = field.alias?.value || field.name.value;
  if (responseName === '__typename' || field.name.value.startsWith('__')) {
    return;
  }
  const fieldDef = parentType.getFields()[field.name.value];
  if (!fieldDef) {
    return;
  }
  const odataName = propertyMap.get(responseName) || propertyMap.get(field.name.value) || field.name.value;
  const namedType = getNamedType(fieldDef.type);

  if (isLeafType(namedType)) {
    out.select.add(odataName);
    return;
  }

  if (isObjectType(namedType) && field.selectionSet) {
    const nested = { select: new Set<string>(), expand: [] as string[] };
    collectSelections(field.selectionSet.selections, namedType, info, propertyMap, nested);
    const nestedParts: string[] = [];
    if (nested.select.size) {
      nestedParts.push(`$select=${[...nested.select].join(',')}`);
    }
    if (nested.expand.length) {
      nestedParts.push(`$expand=${nested.expand.join(',')}`);
    }
    out.expand.push(nestedParts.length ? `${odataName}(${nestedParts.join(';')})` : odataName);
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
    collectSelections(fieldNode.selectionSet.selections, returnType, info, propertyMap, out);
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
 * GraphQL selection (Hive-only optimization; Router never runs this path).
 */
export function appendODataSelectExpand(
  fullPath: string,
  info: GraphQLResolveInfo,
  connectSelection?: string,
): string {
  if (pathAlreadyHasODataProjection(fullPath)) {
    return fullPath;
  }
  const { select, expand } = buildODataSelectExpand(info, connectSelection);
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
