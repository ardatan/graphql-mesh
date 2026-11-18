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

export type CompactSelection =
  { kind: 'scalar'; wire: string } | { kind: 'fields'; fields: CompactSelectionField[] };

export type CompactSelectionField = {
  graphqlName: string;
  id: number;
  wire?: string;
  children?: CompactSelectionField[];
  mapGet?: string;
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
  const scalar = trimmed.match(/^\$\(([^)]+)\)\s*$/);
  if (scalar) {
    return { kind: 'scalar', wire: scalar[1].trim() };
  }
  return { kind: 'fields', fields: parseCompactSelectionFields(trimmed) };
}

/** Project a wire success value (by field id map or raw) through compact selection. */
export function applyCompactSelection(selection: CompactSelection, successWire: any): any {
  if (selection.kind === 'scalar') {
    if (selection.wire === 'void') return null;
    return successWire;
  }
  // Top-level list/set of structs: project each element by field mappings.
  if (Array.isArray(successWire)) {
    return successWire.map(item => projectSelectionFields(selection.fields, item));
  }
  return projectSelectionFields(selection.fields, successWire);
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

function graphqlKeyFromValuePath(valuePath: string): string {
  const trimmed = valuePath.trim();
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
  const m = line.match(/^(\d+)\(([^)]+)\):\s*(.+?)(?:\s*\{)?\s*$/);
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
  // name: 1(i32)->get("primary")  OR  name: 1 {  OR  name: 1(list) {
  const m = line.match(
    /^([A-Za-z_][\w]*)\s*:\s*(\d+)(?:\(([^)]+)\))?(?:->get\("([^"]+)"\))?\s*(\{)?\s*$/,
  );
  if (!m) {
    throw new Error(`Invalid compact thrift selection line: ${line}`);
  }
  const graphqlName = m[1];
  const id = Number(m[2]);
  const wire = m[3]?.trim();
  const mapGet = m[4];
  const opensBlock = Boolean(m[5]);
  if (!opensBlock) {
    return { field: { graphqlName, id, wire, mapGet }, next: index + 1 };
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
    field: { graphqlName, id, wire, mapGet, children },
    next: i + 1,
  };
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
      result[field.graphqlName] = raw;
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
