import { TType } from '@creditkarma/thrift-server-core';
import type { TypeMap, TypeVal } from './types.js';

const TOKEN_TO_TTYPE: Record<string, TType> = {
  bool: TType.BOOL,
  byte: TType.BYTE,
  i8: TType.BYTE,
  i16: TType.I16,
  i32: TType.I32,
  i64: TType.I64,
  double: TType.DOUBLE,
  string: TType.STRING,
  struct: TType.STRUCT,
  list: TType.LIST,
  set: TType.SET,
  map: TType.MAP,
  void: TType.VOID,
};

/** Connectors-style `@` wildcard in `->match` arms. */
export const MATCH_WILDCARD: unique symbol = Symbol.for('thrift-compact-match-@');
export type MatchAtom = string | number | boolean | typeof MATCH_WILDCARD;
export type MatchArm = [MatchAtom, MatchAtom];

export type CompactSelection =
  | {
      kind: 'scalar';
      wire: string;
      match?: MatchArm[];
      mapMatch?: MatchArm[];
    }
  | { kind: 'fields'; fields: CompactSelectionField[] };

export type CompactSelectionField = {
  graphqlName: string;
  id: number;
  wire?: string;
  children?: CompactSelectionField[];
  mapGet?: string;
  /** `->match` arms (typically wire i32 → GraphQL name). */
  match?: MatchArm[];
  /** `->map(@->match(...))` arms applied per list/set element. */
  mapMatch?: MatchArm[];
};

/**
 * Parse compact `@thrift__rpc(args:)` into a TypeMap keyed by GraphQL arg / field name
 * (compatible with the thrift writer's struct field map).
 */
export function parseCompactArgsToTypeMap(src: string): TypeMap {
  const fields = parseCompactArgFields(src || '');
  const map: TypeMap = {};
  for (const field of fields) {
    const key = graphqlKeyFromValuePath(field.valuePath);
    map[key] = argFieldToTypeVal(field);
  }
  return map;
}

export function parseCompactSelection(src: string): CompactSelection {
  // Strip `#` IDL comment lines before scalar `$(i32)` / fields detection.
  const trimmed = stripHashCommentLines(src || '').trim();
  if (!trimmed) {
    return { kind: 'scalar', wire: 'void' };
  }
  // Single-line scalar: `$(i32)`, `$(i32)->match(...)`, `$(list)->map(@->match(...))`.
  if (!trimmed.includes('\n') && trimmed.startsWith('$(')) {
    const close = trimmed.indexOf(')');
    if (close > 2) {
      const wire = trimmed.slice(2, close).trim();
      const suffixes = parsePipeSuffixes(trimmed.slice(close + 1).trim());
      return {
        kind: 'scalar',
        wire,
        match: suffixes.match,
        mapMatch: suffixes.mapMatch,
      };
    }
  }
  return { kind: 'fields', fields: parseCompactSelectionFields(trimmed) };
}

/** Project a wire success value (by field id map or raw) through compact selection. */
export function applyCompactSelection(selection: CompactSelection, successWire: any): any {
  if (selection.kind === 'scalar') {
    if (selection.wire === 'void') return null;
    return applyMatchCoerce(successWire, selection.match, selection.mapMatch);
  }
  // Top-level list/set of structs: project each element by field mappings.
  if (Array.isArray(successWire)) {
    return successWire.map(item => projectSelectionFields(selection.fields, item));
  }
  return projectSelectionFields(selection.fields, successWire);
}

/** Apply Connectors-style match arms (`[@, @]` wildcards supported). */
export function applyMatch(value: unknown, arms?: MatchArm[]): unknown {
  if (!arms?.length) return value;
  for (const [from, to] of arms) {
    if (from === MATCH_WILDCARD || Object.is(from, value)) {
      return to === MATCH_WILDCARD ? value : to;
    }
  }
  return value;
}

export function applyMatchCoerce(raw: unknown, match?: MatchArm[], mapMatch?: MatchArm[]): unknown {
  if (mapMatch?.length && Array.isArray(raw)) {
    return raw.map(v => applyMatch(v, mapMatch));
  }
  return applyMatch(raw, match);
}

/** GraphQL enum name (or bare i32) → Thrift wire i32 via TypeVal.values. */
export function enumNameToWire(value: unknown, values?: Record<string, number>): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && values && value in values) {
    return values[value];
  }
  return 0;
}

/** Build name→i32 table from args-direction match arms `["NAME", n]`. */
export function matchArmsToEnumValues(arms?: MatchArm[]): Record<string, number> | undefined {
  if (!arms?.length) return undefined;
  const values: Record<string, number> = {};
  for (const [from, to] of arms) {
    if (typeof from === 'string' && typeof to === 'number') {
      values[from] = to;
    }
  }
  return Object.keys(values).length ? values : undefined;
}

/** Drop `# …` lines (IDL comments embedded above args/selection bodies). */
function stripHashCommentLines(src: string): string {
  return src
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('#'))
    .join('\n');
}

export type CompactThrow = {
  typeName: string;
  id: number;
  fields: CompactSelectionField[];
};

/**
 * Parse compact `@thrift__rpc(throws:)` — `TypeName: <id> { field: id(wire) }`.
 */
export function parseCompactThrows(src: string): CompactThrow[] {
  if (!(src || '').trim()) return [];
  return parseCompactSelectionFields(src).map(field => ({
    typeName: field.graphqlName,
    id: field.id,
    fields: field.children || [],
  }));
}

type ArgField = {
  id: number;
  wire: string;
  valuePath: string;
  children?: ArgField[];
};

function stripPipeSuffixes(expr: string): string {
  const trimmed = expr.trim();
  const arrow = trimmed.search(/->(?:match|map)\(/);
  return arrow >= 0 ? trimmed.slice(0, arrow).trim() : trimmed;
}

function graphqlKeyFromValuePath(valuePath: string): string {
  const trimmed = stripPipeSuffixes(valuePath);
  if (trimmed.startsWith('$args.')) {
    return trimmed.slice('$args.'.length).split('.')[0];
  }
  if (trimmed.startsWith('$args')) {
    return trimmed.slice(1);
  }
  return trimmed.split('.')[0];
}

function argFieldToTypeVal(field: ArgField): TypeVal {
  const base = tokenToTypeVal(field.wire, field.id);
  if (field.children?.length) {
    if (base.type === TType.LIST || base.type === TType.SET) {
      // list/set of map<*, struct> { value fields } — keep LIST→MAP→STRUCT.
      if (base.elementType && base.elementType.type === TType.MAP) {
        const fields: TypeMap = {};
        for (const child of field.children) {
          fields[graphqlKeyFromValuePath(child.valuePath)] = argFieldToTypeVal(child);
        }
        const valBase = base.elementType.valType;
        const valName =
          valBase && valBase.type === TType.STRUCT && valBase.name ? valBase.name : 'Anon';
        return {
          ...base,
          elementType: {
            ...base.elementType,
            keyType: base.elementType.keyType,
            valType: {
              type: TType.STRUCT,
              name: valName,
              fields,
              id: (valBase && 'id' in valBase ? valBase.id : undefined) ?? field.id,
            },
          },
        };
      }
      const elemFields: TypeMap = {};
      for (const child of field.children) {
        elemFields[graphqlKeyFromValuePath(child.valuePath)] = argFieldToTypeVal(child);
      }
      return {
        ...base,
        elementType: {
          type: TType.STRUCT,
          name: 'Anon',
          fields: elemFields,
          id: field.id,
        },
      };
    }
    // map<*, struct> { field descriptors } — keep MAP wire type; children describe valType.
    if (base.type === TType.MAP) {
      const fields: TypeMap = {};
      for (const child of field.children) {
        fields[graphqlKeyFromValuePath(child.valuePath)] = argFieldToTypeVal(child);
      }
      const valBase = base.valType;
      const valName =
        valBase && valBase.type === TType.STRUCT && valBase.name ? valBase.name : 'Anon';
      return {
        ...base,
        keyType: base.keyType,
        valType: {
          type: TType.STRUCT,
          name: valName,
          fields,
          id: (valBase && 'id' in valBase ? valBase.id : undefined) ?? field.id,
        },
      };
    }
    const fields: TypeMap = {};
    for (const child of field.children) {
      fields[graphqlKeyFromValuePath(child.valuePath)] = argFieldToTypeVal(child);
    }
    return {
      type: TType.STRUCT,
      name: graphqlKeyFromValuePath(field.valuePath),
      fields,
      id: field.id,
    };
  }
  // `5(i32): $args.kind->match(["A", 0], …)` — promote to ENUM with name→i32 table.
  // `1(list): $args.kinds->map(@->match(...))` — ENUM element type on the list/set.
  const suffixes = parsePipeSuffixes(
    field.valuePath.includes('->') ? field.valuePath.slice(field.valuePath.indexOf('->')) : '',
  );
  const values = matchArmsToEnumValues(suffixes.mapMatch ?? suffixes.match);
  if (values) {
    if (base.type === TType.LIST || base.type === TType.SET) {
      return {
        ...base,
        elementType: { type: TType.ENUM, values },
      };
    }
    return { type: TType.ENUM, id: field.id, values };
  }
  return base;
}

function tokenToTypeVal(wire: string, id: number): TypeVal {
  const trimmed = wire.trim();
  const list = trimmed.match(/^list(?:<(.+)>)?$/);
  if (list) {
    return {
      type: TType.LIST,
      id,
      elementType: list[1]
        ? tokenToTypeVal(list[1], id)
        : { type: TType.STRUCT, name: 'Anon', fields: {}, id },
    };
  }
  const set = trimmed.match(/^set(?:<(.+)>)?$/);
  if (set) {
    return {
      type: TType.SET,
      id,
      elementType: set[1] ? tokenToTypeVal(set[1], id) : { type: TType.I32, id },
    };
  }
  const mapOpen = trimmed.match(/^map<(.+)>$/);
  if (mapOpen) {
    // Split key/val at depth-0 comma so `map<string, map<i32, string>>` parses.
    const inner = mapOpen[1];
    const comma = findDepth0Comma(inner);
    if (comma >= 0) {
      return {
        type: TType.MAP,
        id,
        keyType: tokenToTypeVal(inner.slice(0, comma).trim(), id),
        valType: tokenToTypeVal(inner.slice(comma + 1).trim(), id),
      };
    }
  }
  const ttype = TOKEN_TO_TTYPE[trimmed];
  if (ttype === TType.STRUCT) {
    return { type: TType.STRUCT, name: 'Anon', fields: {}, id };
  }
  if (ttype != null) {
    return { type: ttype as any, id };
  }
  // Unknown token — match resolveTypeVal fallback (i32).
  return { type: TType.I32, id };
}

function parseCompactArgFields(src: string): ArgField[] {
  const lines = flattenMapping(src);
  const fields: ArgField[] = [];
  let i = 0;
  while (i < lines.length) {
    const { field, next } = parseArgFieldAt(lines, i);
    fields.push(field);
    i = next;
  }
  return fields;
}

function parseArgFieldAt(lines: string[], index: number): { field: ArgField; next: number } {
  const line = lines[index];
  // Optional leading `-` — @creditkarma/thrift-parser keeps signed field IDs.
  const m = line.match(/^(-?\d+)\(([^)]+)\):\s*(.+?)(?:\s*\{)?\s*$/);
  if (!m) {
    throw new Error(`Invalid compact thrift args line: ${line}`);
  }
  const id = Number(m[1]);
  const wire = m[2].trim();
  let valuePath = m[3].trim();
  const opensBlock = line.trimEnd().endsWith('{') || valuePath.endsWith('{');
  if (valuePath.endsWith('{')) {
    valuePath = valuePath.slice(0, -1).trim();
  }
  if (!opensBlock) {
    return { field: { id, wire, valuePath }, next: index + 1 };
  }
  const children: ArgField[] = [];
  let i = index + 1;
  while (i < lines.length && lines[i] !== '}') {
    const parsed = parseArgFieldAt(lines, i);
    children.push(parsed.field);
    i = parsed.next;
  }
  if (i >= lines.length || lines[i] !== '}') {
    throw new Error(`Unclosed compact thrift args block starting at: ${line}`);
  }
  return { field: { id, wire, valuePath, children }, next: i + 1 };
}

function parseCompactSelectionFields(src: string): CompactSelectionField[] {
  const lines = flattenMapping(src);
  const fields: CompactSelectionField[] = [];
  let i = 0;
  while (i < lines.length) {
    const { field, next } = parseSelectionFieldAt(lines, i);
    fields.push(field);
    i = next;
  }
  return fields;
}

function parseSelectionFieldAt(
  lines: string[],
  index: number,
): { field: CompactSelectionField; next: number } {
  const line = lines[index];
  // name: 1(i32)->match(...)  OR  name: 1(i32)->get("primary")  OR  name: 1 {
  // Optional leading `-` on field id (signed Thrift field IDs).
  const m = line.match(/^([A-Za-z_][\w]*)\s*:\s*(-?\d+)(?:\(([^)]+)\))?(.*)$/);
  if (!m) {
    throw new Error(`Invalid compact thrift selection line: ${line}`);
  }
  const graphqlName = m[1];
  const id = Number(m[2]);
  const wire = m[3]?.trim();
  let rest = (m[4] || '').trim();
  const opensBlock = rest.endsWith('{');
  if (opensBlock) {
    rest = rest.slice(0, -1).trim();
  }
  const suffixes = parsePipeSuffixes(rest);
  if (!opensBlock) {
    return {
      field: {
        graphqlName,
        id,
        wire,
        mapGet: suffixes.mapGet,
        match: suffixes.match,
        mapMatch: suffixes.mapMatch,
      },
      next: index + 1,
    };
  }
  const children: CompactSelectionField[] = [];
  let i = index + 1;
  while (i < lines.length && lines[i] !== '}') {
    const parsed = parseSelectionFieldAt(lines, i);
    children.push(parsed.field);
    i = parsed.next;
  }
  if (i >= lines.length || lines[i] !== '}') {
    throw new Error(`Unclosed compact thrift selection block starting at: ${line}`);
  }
  return {
    field: {
      graphqlName,
      id,
      wire,
      mapGet: suffixes.mapGet,
      match: suffixes.match,
      mapMatch: suffixes.mapMatch,
      children,
    },
    next: i + 1,
  };
}

/**
 * Parse trailing Connectors-style pipes: `->get("k")`, `->match(...)`, `->map(@->match(...))`.
 */
function parsePipeSuffixes(rest: string): {
  mapGet?: string;
  match?: MatchArm[];
  mapMatch?: MatchArm[];
} {
  let cursor = rest.trim();
  let mapGet: string | undefined;
  let match: MatchArm[] | undefined;
  let mapMatch: MatchArm[] | undefined;
  while (cursor.startsWith('->')) {
    if (cursor.startsWith('->get("')) {
      const end = cursor.indexOf('")', 7);
      if (end < 0) break;
      mapGet = cursor.slice(7, end);
      cursor = cursor.slice(end + 2).trim();
      continue;
    }
    if (cursor.startsWith('->match(')) {
      const call = extractParenCall(cursor, '->match');
      if (!call) break;
      match = parseMatchArms(call.args);
      cursor = call.rest.trim();
      continue;
    }
    if (cursor.startsWith('->map(')) {
      const call = extractParenCall(cursor, '->map');
      if (!call) break;
      const inner = call.args.trim();
      // `@->match(...)` (element wildcard + match).
      const atMatch = inner.match(/^@\s*(->match\(.*)$/);
      if (atMatch) {
        const innerCall = extractParenCall(atMatch[1], '->match');
        if (innerCall) {
          mapMatch = parseMatchArms(innerCall.args);
        }
      }
      cursor = call.rest.trim();
      continue;
    }
    break;
  }
  return { mapGet, match, mapMatch };
}

function extractParenCall(src: string, head: string): { args: string; rest: string } | null {
  if (!src.startsWith(`${head}(`)) return null;
  let depth = 0;
  for (let i = head.length; i < src.length; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) {
        return {
          args: src.slice(head.length + 1, i),
          rest: src.slice(i + 1),
        };
      }
    }
  }
  return null;
}

function parseMatchArms(inner: string): MatchArm[] {
  const arms: MatchArm[] = [];
  for (const part of splitTopLevel(inner, ',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^\[(.+)\]$/);
    if (!m) continue;
    const comma = findDepth0Comma(m[1]);
    if (comma < 0) continue;
    arms.push([parseMatchAtom(m[1].slice(0, comma)), parseMatchAtom(m[1].slice(comma + 1))]);
  }
  return arms;
}

function parseMatchAtom(raw: string): MatchAtom {
  const t = raw.trim();
  if (t === '@') return MATCH_WILDCARD;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+$/.test(t)) return Number(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    try {
      return JSON.parse(t.startsWith("'") ? `"${t.slice(1, -1)}"` : t);
    } catch {
      return t.slice(1, -1);
    }
  }
  return t;
}

/** Split `s` on `sep` at bracket/paren depth 0 (strings ignored via simple quote scan). */
function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === sep && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

/** Index of the first `,` at angle-bracket depth 0, or -1. */
function findDepth0Comma(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '<') depth++;
    else if (c === '>') depth--;
    else if (c === ',' && depth === 0) return i;
  }
  return -1;
}

/** Normalize mapping text into significant lines (`}` alone, no blanks). */
function flattenMapping(src: string): string[] {
  const out: string[] = [];
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // IDL comments copied above args/selection mapping body.
    if (line.startsWith('#')) continue;
    if (line === '}') {
      out.push('}');
      continue;
    }
    out.push(line);
  }
  return out;
}

function projectSelectionFields(fields: CompactSelectionField[], wireValue: any): any {
  if (wireValue == null) return wireValue;
  // Success payload may be a Map<fieldId, value> from id-aware decode, or a plain object.
  const result: Record<string, any> = {};
  for (const field of fields) {
    let raw = getByFieldId(wireValue, field.id);
    if (field.mapGet != null && raw && typeof raw === 'object') {
      raw = raw[field.mapGet];
    }
    if (field.children?.length) {
      if (Array.isArray(raw)) {
        result[field.graphqlName] = raw.map(item => projectSelectionFields(field.children!, item));
      } else {
        result[field.graphqlName] = projectSelectionFields(field.children, raw);
      }
    } else {
      result[field.graphqlName] = applyMatchCoerce(raw, field.match, field.mapMatch);
    }
  }
  return result;
}

function getByFieldId(wireValue: any, id: number): any {
  if (wireValue == null) return undefined;
  if (wireValue instanceof Map) {
    return wireValue.get(id);
  }
  if (typeof wireValue === 'object') {
    if (id in wireValue) return wireValue[id];
    if (String(id) in wireValue) return wireValue[String(id)];
  }
  return undefined;
}
