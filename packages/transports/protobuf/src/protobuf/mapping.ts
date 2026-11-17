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
  return parseFieldList(s, 0).fields;
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
    // optional bind after nested block: `1(message): movie { ... }` already consumed;
    // support `1(message): { ... }` or `1(message): name { ... }` — if we had a bind before `{`
    return {
      field: {
        id,
        type: { kind: 'message', fields: nested.fields },
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
    return { type: { kind: 'message', fields: [] }, end: i + 'message'.length };
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

export function resolveBind(
  bind: string | undefined,
  args: Record<string, any>,
  thisRoot?: Record<string, any>,
): any {
  if (bind == null || bind === '') {
    return undefined;
  }
  if (bind.startsWith('$this.')) {
    return getPath(thisRoot ?? args, bind.slice('$this.'.length));
  }
  if (bind === '$this') {
    return thisRoot ?? args;
  }
  if (bind.startsWith('$args.')) {
    return getPath(args, bind.slice('$args.'.length));
  }
  if (bind === '$args') {
    return args;
  }
  return getPath(args, bind);
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
