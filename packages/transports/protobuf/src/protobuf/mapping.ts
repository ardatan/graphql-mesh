/**
 * Compact protobuf mapping dialect (see Mesh protobuf RPC spec).
 * body/selection: fieldId(type): bind  with nested { }
 */

export type ProtoScalar =
  | 'bool'
  | 'int32'
  | 'sint32'
  | 'uint32'
  | 'int64'
  | 'sint64'
  | 'uint64'
  | 'fixed32'
  | 'fixed64'
  | 'sfixed32'
  | 'sfixed64'
  | 'float'
  | 'double'
  | 'string'
  | 'bytes';

export type ProtoType =
  | { kind: 'scalar'; name: ProtoScalar }
  | { kind: 'enum'; values: Record<string, number> }
  | { kind: 'message'; fields: MappingField[] }
  /**
   * Cycle-aware message reference: `message&` / `message&N` means reuse the field list
   * of the message N levels up (0 = enclosing). Resolved to `{ kind: 'message', fields }`
   * (shared array) by `parseMapping` before the codec runs.
   */
  | { kind: 'messageRef'; levelsUp: number }
  /**
   * Named message reference: `message@TypeName` reuses a top-level `@TypeName { … }` def.
   * Used for shared acyclic types so sibling fields do not re-inline the same graph.
   */
  | { kind: 'messageNamedRef'; name: string }
  | { kind: 'repeated'; element: ProtoType }
  | { kind: 'map'; key: ProtoType; value: ProtoType };

export interface MappingField {
  id: number;
  type: ProtoType;
  /** GraphQL bind path (e.g. year, $args.year, input.movie) or nested omit when type is message with fields */
  bind?: string;
  fields?: MappingField[];
  /**
   * Proto3 field presence. Implicit-presence scalars/enums materialize wire defaults when
   * absent; explicit (`optional` / proto3 optional) leave the bind undefined when absent.
   */
  presence?: 'implicit' | 'explicit';
}

export function parseMapping(source: string): MappingField[] {
  const s = source.trim();
  if (!s) return [];
  const { defs, rest } = parseNamedDefs(s);
  const fields = parseFieldList(rest, 0).fields;
  resolveMessageRefs(fields, [], defs);
  return fields;
}

/** Parse leading `@Name { … }` reusable message definitions. */
function parseNamedDefs(source: string): {
  defs: Map<string, MappingField[]>;
  rest: string;
} {
  const defs = new Map<string, MappingField[]>();
  let i = skipWs(source, 0);
  while (source[i] === '@') {
    i++;
    const nameStart = i;
    while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i++;
    const name = source.slice(nameStart, i);
    if (!name) {
      throw new Error(`Expected name after '@' at ${snippet(source, i)}`);
    }
    i = skipWs(source, i);
    if (source[i] !== '{') {
      throw new Error(`Expected '{' after @${name} at ${snippet(source, i)}`);
    }
    i++;
    const nested = parseFieldList(source, i);
    i = skipWs(source, nested.end);
    if (source[i] !== '}') {
      throw new Error(`Expected '}' after @${name} at ${snippet(source, i)}`);
    }
    i++;
    defs.set(name, nested.fields);
    i = skipWs(source, i);
  }
  return { defs, rest: source.slice(i) };
}

/**
 * Replace `message&` / `message&N` / `message@Name` placeholders with shared field-list
 * references so recursive and DAG-shared messages keep structure without empty stubs.
 */
function resolveMessageRefs(
  fields: MappingField[],
  ancestors: MappingField[][] = [],
  namedDefs: Map<string, MappingField[]> = new Map(),
  resolvedNamed: Set<MappingField[]> = new Set(),
): void {
  const stack = [...ancestors, fields];
  for (const field of fields) {
    const wasNamed =
      field.type.kind === 'messageNamedRef' ||
      (field.type.kind === 'repeated' && field.type.element.kind === 'messageNamedRef') ||
      (field.type.kind === 'map' && field.type.value.kind === 'messageNamedRef');
    const bound = bindMessageRef(field.type, stack, namedDefs);
    if (bound) {
      field.type = bound.type;
      field.fields = bound.fields;
      // Ancestor `message&` targets are already on the walk stack — do not re-enter.
      // Named defs are walked once so nested refs inside `@Name { … }` resolve.
      if (wasNamed && !resolvedNamed.has(bound.fields)) {
        resolvedNamed.add(bound.fields);
        resolveMessageRefs(bound.fields, stack, namedDefs, resolvedNamed);
      }
      continue;
    }
    if (field.type.kind === 'message' && field.fields?.length) {
      resolveMessageRefs(field.fields, stack, namedDefs, resolvedNamed);
    } else if (
      field.type.kind === 'repeated' &&
      field.type.element.kind === 'message' &&
      field.fields?.length
    ) {
      resolveMessageRefs(field.fields, stack, namedDefs, resolvedNamed);
    } else if (
      field.type.kind === 'map' &&
      field.type.value.kind === 'message' &&
      field.fields?.length
    ) {
      resolveMessageRefs(field.fields, stack, namedDefs, resolvedNamed);
    }
  }
}

function bindMessageRef(
  type: ProtoType,
  stack: MappingField[][],
  namedDefs: Map<string, MappingField[]>,
): { type: ProtoType; fields: MappingField[] } | undefined {
  const resolveNamed = (name: string): MappingField[] => {
    const target = namedDefs.get(name);
    if (!target) {
      throw new Error(`Unknown message@${name}: no matching @${name} { … } definition`);
    }
    return target;
  };
  if (type.kind === 'messageNamedRef') {
    const target = resolveNamed(type.name);
    return { type: { kind: 'message', fields: target }, fields: target };
  }
  if (type.kind === 'messageRef') {
    const target = stack[stack.length - 1 - type.levelsUp];
    if (!target) {
      throw new Error(
        `Invalid message&${type.levelsUp === 0 ? '' : type.levelsUp}: exceeds nesting depth ${stack.length}`,
      );
    }
    return { type: { kind: 'message', fields: target }, fields: target };
  }
  if (type.kind === 'repeated' && type.element.kind === 'messageNamedRef') {
    const target = resolveNamed(type.element.name);
    return {
      type: { kind: 'repeated', element: { kind: 'message', fields: target } },
      fields: target,
    };
  }
  if (type.kind === 'repeated' && type.element.kind === 'messageRef') {
    const target = stack[stack.length - 1 - type.element.levelsUp];
    if (!target) {
      throw new Error(
        `Invalid repeated message&${type.element.levelsUp === 0 ? '' : type.element.levelsUp}: exceeds nesting depth ${stack.length}`,
      );
    }
    return {
      type: { kind: 'repeated', element: { kind: 'message', fields: target } },
      fields: target,
    };
  }
  if (type.kind === 'map' && type.value.kind === 'messageNamedRef') {
    const target = resolveNamed(type.value.name);
    return {
      type: { kind: 'map', key: type.key, value: { kind: 'message', fields: target } },
      fields: target,
    };
  }
  if (type.kind === 'map' && type.value.kind === 'messageRef') {
    const target = stack[stack.length - 1 - type.value.levelsUp];
    if (!target) {
      throw new Error(
        `Invalid map value message&${type.value.levelsUp === 0 ? '' : type.value.levelsUp}: exceeds nesting depth ${stack.length}`,
      );
    }
    return {
      type: { kind: 'map', key: type.key, value: { kind: 'message', fields: target } },
      fields: target,
    };
  }
  return undefined;
}

function parseFieldList(source: string, start: number): { fields: MappingField[]; end: number } {
  const fields: MappingField[] = [];
  let i = skipWs(source, start);
  while (i < source.length && source[i] !== '}') {
    const parsed = parseField(source, i);
    fields.push(parsed.field);
    i = skipWs(source, parsed.end);
  }
  return { fields, end: i };
}

function parseField(source: string, start: number): { field: MappingField; end: number } {
  let i = skipWs(source, start);
  const idStart = i;
  while (i < source.length && /[0-9]/.test(source[i])) i++;
  if (i === idStart) {
    throw new Error(`Expected field id at ${snippet(source, start)}`);
  }
  const id = Number(source.slice(idStart, i));
  i = skipWs(source, i);
  if (source[i] !== '(') {
    throw new Error(`Expected '(' after field id ${id} at ${snippet(source, i)}`);
  }
  i++;
  i = skipWs(source, i);
  let presence: 'implicit' | 'explicit' | undefined;
  if (source.startsWith('optional', i)) {
    presence = 'explicit';
    i = skipWs(source, i + 'optional'.length);
  }
  const typeParsed = parseType(source, i);
  // Scalars/enums default to implicit presence unless marked `optional`.
  if (presence == null && (typeParsed.type.kind === 'scalar' || typeParsed.type.kind === 'enum')) {
    presence = 'implicit';
  }
  i = skipWs(source, typeParsed.end);
  if (source[i] !== ')') {
    throw new Error(`Expected ')' after type at ${snippet(source, i)}`);
  }
  i++;
  i = skipWs(source, i);
  if (source[i] !== ':') {
    throw new Error(`Expected ':' after type at ${snippet(source, i)}`);
  }
  i++;
  i = skipWs(source, i);

  if (source[i] === '{') {
    i++;
    const nested = parseFieldList(source, i);
    i = skipWs(source, nested.end);
    if (source[i] !== '}') {
      throw new Error(`Expected '}' at ${snippet(source, i)}`);
    }
    i++;
    // Unbound nested block: keep collection wrappers (`repeated` / `map`) like the bound branch.
    const baseType = typeParsed.type;
    const messageType: ProtoType = { kind: 'message', fields: nested.fields };
    let type: ProtoType;
    if (baseType.kind === 'repeated') {
      type = { kind: 'repeated', element: messageType };
    } else if (baseType.kind === 'map') {
      type = { kind: 'map', key: baseType.key, value: messageType };
    } else {
      type = messageType;
    }
    return {
      field: {
        id,
        type,
        fields: nested.fields,
      },
      end: i,
    };
  }

  const bindStart = i;
  while (i < source.length && !/[\s}]/.test(source[i])) {
    // allow $args.foo.bar
    if (source[i] === '{') break;
    i++;
  }
  // If next non-ws is `{`, bind was a name before nested message
  const afterBind = skipWs(source, i);
  if (source[afterBind] === '{') {
    const bind = source.slice(bindStart, i).trim();
    i = afterBind + 1;
    const nested = parseFieldList(source, i);
    i = skipWs(source, nested.end);
    if (source[i] !== '}') {
      throw new Error(`Expected '}' at ${snippet(source, i)}`);
    }
    i++;
    const baseType = typeParsed.type;
    const messageType: ProtoType = { kind: 'message', fields: nested.fields };
    let type: ProtoType;
    if (baseType.kind === 'repeated') {
      type = { kind: 'repeated', element: messageType };
    } else if (baseType.kind === 'map') {
      // `map<K,message>: bind { …fields }` — keep map wire type, attach value message fields.
      type = { kind: 'map', key: baseType.key, value: messageType };
    } else {
      type = messageType;
    }
    return {
      field: {
        id,
        type,
        bind: bind || undefined,
        fields: nested.fields,
      },
      end: i,
    };
  }

  const bind = source.slice(bindStart, i).trim();
  return {
    field: {
      id,
      type: typeParsed.type,
      bind: bind || undefined,
      ...(presence ? { presence } : {}),
    },
    end: i,
  };
}

function parseType(source: string, start: number): { type: ProtoType; end: number } {
  let i = skipWs(source, start);
  if (source.startsWith('repeated', i)) {
    i = skipWs(source, i + 'repeated'.length);
    const el = parseType(source, i);
    return { type: { kind: 'repeated', element: el.type }, end: el.end };
  }
  if (source.startsWith('map<', i)) {
    i = skipWs(source, i + 4);
    const key = parseType(source, i);
    i = skipWs(source, key.end);
    if (source[i] !== ',') {
      throw new Error(`Expected ',' in map<> at ${snippet(source, i)}`);
    }
    i++;
    const value = parseType(source, i);
    i = skipWs(source, value.end);
    if (source[i] !== '>') {
      throw new Error(`Expected '>' in map<> at ${snippet(source, i)}`);
    }
    return {
      type: { kind: 'map', key: key.type, value: value.type },
      end: i + 1,
    };
  }
  if (source.startsWith('enum{', i) || source.startsWith('enum {', i)) {
    const brace = source.indexOf('{', i);
    i = brace + 1;
    const values: Record<string, number> = {};
    i = skipWs(source, i);
    while (i < source.length && source[i] !== '}') {
      const nameStart = i;
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) i++;
      const name = source.slice(nameStart, i);
      i = skipWs(source, i);
      if (source[i] !== '=') {
        throw new Error(`Expected '=' in enum at ${snippet(source, i)}`);
      }
      i++;
      i = skipWs(source, i);
      const numStart = i;
      while (i < source.length && /[0-9-]/.test(source[i])) i++;
      values[name] = Number(source.slice(numStart, i));
      i = skipWs(source, i);
      if (source[i] === ',') {
        i++;
        i = skipWs(source, i);
      }
    }
    if (source[i] !== '}') {
      throw new Error(`Expected '}' in enum at ${snippet(source, i)}`);
    }
    return { type: { kind: 'enum', values }, end: i + 1 };
  }
  if (source.startsWith('message', i)) {
    let j = i + 'message'.length;
    if (source[j] === '&') {
      j++;
      let levelsUp = 0;
      if (j < source.length && /[0-9]/.test(source[j])) {
        const numStart = j;
        while (j < source.length && /[0-9]/.test(source[j])) j++;
        levelsUp = Number(source.slice(numStart, j));
      }
      return { type: { kind: 'messageRef', levelsUp }, end: j };
    }
    if (source[j] === '@') {
      j++;
      const nameStart = j;
      while (j < source.length && /[A-Za-z0-9_]/.test(source[j])) j++;
      const name = source.slice(nameStart, j);
      if (!name) {
        throw new Error(`Expected name after message@ at ${snippet(source, j)}`);
      }
      return { type: { kind: 'messageNamedRef', name }, end: j };
    }
    return { type: { kind: 'message', fields: [] }, end: j };
  }
  const nameStart = i;
  while (i < source.length && /[a-z0-9]/.test(source[i])) i++;
  const name = source.slice(nameStart, i) as ProtoScalar;
  return { type: { kind: 'scalar', name }, end: i };
}

function skipWs(source: string, i: number): number {
  while (i < source.length) {
    if (/\s/.test(source[i])) {
      i++;
      continue;
    }
    // `#` comments are documentation-only (loader emit / hand SDL); skip to EOL
    if (source[i] === '#') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    break;
  }
  return i;
}

function snippet(source: string, i: number): string {
  return JSON.stringify(source.slice(Math.max(0, i - 10), i + 20));
}

/**
 * `$this.<parentPath>` or dual `$this.<parentPath>|$args.<argsPath>` when parent field
 * renames and argument renames diverge. Runtime prefers the parent object key, then the
 * args path (explicit dual args path, or the same path when single-form).
 */
export function parseThisBind(bind: string): { thisPath: string; argsPath: string } | undefined {
  if (bind === '$this') {
    return { thisPath: '', argsPath: '' };
  }
  if (!bind.startsWith('$this.')) {
    return undefined;
  }
  const rest = bind.slice('$this.'.length);
  const split = rest.indexOf('|$args.');
  if (split >= 0) {
    return {
      thisPath: rest.slice(0, split),
      argsPath: rest.slice(split + '|$args.'.length),
    };
  }
  return { thisPath: rest, argsPath: rest };
}

/** Which arm of a relative `a|b` dual to try first (`first` = parent side, `second` = args). */
export type DualArmPrefer = 'first' | 'second';

export function resolveBind(
  bind: string | undefined,
  args: Record<string, any>,
  thisRoot?: Record<string, any>,
  dualPrefer?: DualArmPrefer,
): any {
  if (bind == null || bind === '') {
    return undefined;
  }
  const thisBind = parseThisBind(bind);
  if (thisBind) {
    if (thisBind.thisPath === '' && thisBind.argsPath === '') {
      if (thisRoot != null && typeof thisRoot === 'object') {
        return thisRoot;
      }
      return args;
    }
    // Prefer parent/entity when the public parent field is present.
    if (thisRoot != null && typeof thisRoot === 'object') {
      const fromParent = getPath(thisRoot, thisBind.thisPath);
      if (fromParent !== undefined) {
        return fromParent;
      }
    }
    // Parent absent, empty rootValue, or missing key → args path (may differ after renames).
    return getPath(args, thisBind.argsPath);
  }
  if (bind.startsWith('$args.')) {
    return getPath(args, bind.slice('$args.'.length));
  }
  if (bind === '$args') {
    return args;
  }
  // Relative dual `parentYear|requestYear`: honor the outer dual branch that supplied
  // the local object so an unrelated matching name on the other side cannot win.
  const relDual = bind.indexOf('|');
  if (relDual > 0 && !bind.includes('$')) {
    const first = bind.slice(0, relDual);
    const second = bind.slice(relDual + 1);
    if (dualPrefer === 'second') {
      const fromSecond = getPath(args, second);
      if (fromSecond !== undefined) {
        return fromSecond;
      }
      return getPath(args, first);
    }
    const fromFirst = getPath(args, first);
    if (fromFirst !== undefined) {
      return fromFirst;
    }
    return getPath(args, second);
  }
  return getPath(args, bind);
}

/**
 * Resolve a `$this…|$args…` message bind and report which outer branch supplied the object.
 * Parent-first; args fallback when the parent path is undefined.
 */
export function resolveThisMessageBind(
  bind: string,
  args: Record<string, any>,
  thisRoot?: Record<string, any>,
): { value: any; dualPrefer: DualArmPrefer } {
  const thisBind = parseThisBind(bind);
  if (!thisBind) {
    return { value: resolveBind(bind, args, thisRoot), dualPrefer: 'first' };
  }
  if (thisBind.thisPath === '' && thisBind.argsPath === '') {
    if (thisRoot != null && typeof thisRoot === 'object') {
      return { value: thisRoot, dualPrefer: 'first' };
    }
    return { value: args, dualPrefer: 'second' };
  }
  if (thisRoot != null && typeof thisRoot === 'object') {
    const fromParent = getPath(thisRoot, thisBind.thisPath);
    if (fromParent !== undefined) {
      return { value: fromParent, dualPrefer: 'first' };
    }
  }
  return { value: getPath(args, thisBind.argsPath), dualPrefer: 'second' };
}

function getPath(obj: any, pathStr: string): any {
  if (obj == null) return undefined;
  const parts = pathStr.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}
